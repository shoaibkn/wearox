import { StandardEvents } from '@shopify/events';

/**
 * Shared polite live-region announcer for post-interaction field validation errors.
 */
const liveAnnouncer = (() => {
  /** @type {HTMLDivElement | null} */
  let region = null;
  /** @type {number | undefined} */
  let timer;
  /** @type {Element | null} */
  let activeField = null;

  /** @param {Node} node */
  function spokenText(node) {
    const copy = /** @type {Element} */ (node.cloneNode(true));
    copy.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
    copy.querySelectorAll('[role="img"][aria-label]').forEach((el) => {
      el.replaceWith(`${el.getAttribute('aria-label') || ''}: `);
    });
    return (copy.textContent || '').replace(/\s+/g, ' ').trim();
  }

  /** @param {HTMLInputElement} el */
  function announce(el) {
    const errorId = el.dataset.error;
    if (!errorId) return;
    const errorEl = document.getElementById(errorId);
    if (!errorEl) return;

    if (!region && document.body) {
      region = document.createElement('div');
      region.setAttribute('aria-live', 'polite');
      region.className = 'visually-hidden';
      document.body.append(region);
    }
    if (!region) return;

    const firstLabel = el.labels?.[0];
    const labelPrefix = firstLabel ? `${spokenText(firstLabel)}: ` : '';

    clearTimeout(timer);
    region.textContent = '';
    activeField = el;
    timer = window.setTimeout(() => {
      if (region) {
        region.textContent = labelPrefix + spokenText(errorEl);
      }
    }, 500);
  }

  /** @param {Element} el */
  function clear(el) {
    if (activeField === el && region) {
      clearTimeout(timer);
      region.textContent = '';
    }
  }

  return { announce, clear };
})();

/**
 * Back-in-stock / drop waitlist controller with variant availability tracking and
 * post-interaction ARIA validation sync.
 */
class WearoxNotifyMe extends HTMLElement {
  /** @type {AbortController | null} */
  #abortController = null;

  /** @type {WeakSet<Element>} */
  #flagged = new WeakSet();

  /** @type {WeakSet<Element>} */
  #announced = new WeakSet();

  /** @type {WeakMap<Element, { hasInteracted: boolean; hasBlurred: boolean }>} */
  #dirtyState = new WeakMap();

  /** @type {boolean} */
  #supportsUserInvalid = typeof CSS !== 'undefined' && CSS.supports('selector(:user-invalid)');

  connectedCallback() {
    this.#abortController = new AbortController();
    const { signal } = this.#abortController;

    const form = this.querySelector('form');
    if (form instanceof HTMLFormElement) {
      for (const el of form.querySelectorAll('input:not([type="hidden"]), select, textarea')) {
        if (el instanceof HTMLElement) {
          this.#syncAria(el, false);
        }
      }

      form.addEventListener(
        'blur',
        (event) => {
          if (event.target instanceof HTMLElement) {
            this.#handleInteraction(event.target, 'blur');
          }
        },
        { capture: true, signal }
      );
      form.addEventListener(
        'input',
        (event) => {
          if (event.target instanceof HTMLElement) {
            this.#handleInteraction(event.target, 'input');
          }
        },
        { signal }
      );
      form.addEventListener(
        'change',
        (event) => {
          if (event.target instanceof HTMLElement) {
            this.#handleInteraction(event.target, 'change');
          }
        },
        { capture: true, signal }
      );
      form.addEventListener(
        'invalid',
        (event) => {
          if (event.target instanceof HTMLElement) {
            this.#announced.add(event.target);
            this.#handleInteraction(event.target, 'invalid');
          }
        },
        { capture: true, signal }
      );
      form.addEventListener(
        'reset',
        () => {
          window.setTimeout(() => {
            for (const el of form.elements) {
              if (el instanceof HTMLElement) {
                this.#dirtyState.delete(el);
                el.classList.remove('user-invalid-fallback', 'user-valid-fallback');
                this.#syncAria(el, false);
              }
            }
          });
        },
        { capture: true, signal }
      );
      form.addEventListener(
        'submit',
        (event) => {
          if (!form.checkValidity()) {
            event.preventDefault();
            const firstInvalid = form.querySelector(':invalid');
            if (firstInvalid instanceof HTMLElement) {
              this.#announced.add(firstInvalid);
              this.#handleInteraction(firstInvalid, 'invalid');
              firstInvalid.focus();
            }
            return;
          }

          const submitBtn = form.querySelector('button[type="submit"]');
          if (submitBtn instanceof HTMLButtonElement) {
            submitBtn.disabled = true;
          }
        },
        { signal }
      );
    }

    document.addEventListener(StandardEvents.productSelect, this.#handleVariantSelect, { signal });
  }

  disconnectedCallback() {
    this.#abortController?.abort();
    this.#abortController = null;
  }

  /** @param {Event} event */
  #handleVariantSelect = (event) => {
    const customEvent = /** @type {CustomEvent<any>} */ (event);
    const alwaysShow = this.dataset.alwaysShow === 'true';

    if (!customEvent.detail || typeof customEvent.detail !== 'object' || !('promise' in customEvent.detail)) {
      return;
    }

    Promise.resolve(customEvent.detail.promise)
      .then((result) => {
        const resource = result?.detail?.resource;
        if (!resource || typeof resource !== 'object') return;

        const variantLabel = resource.title ? String(resource.title) : '';
        const variantSku = resource.sku ? String(resource.sku) : '';
        const variantInput = this.querySelector('[data-notify-variant]');
        const skuInput = this.querySelector('[data-notify-sku]');

        if (variantInput instanceof HTMLInputElement && variantLabel) {
          variantInput.value = variantLabel;
        }
        if (skuInput instanceof HTMLInputElement) {
          skuInput.value = variantSku;
        }

        if (!alwaysShow && typeof resource.available === 'boolean') {
          this.hidden = resource.available;
        }
      })
      .catch(() => {});
  };

  /**
   * @param {HTMLElement} el
   * @param {'blur' | 'input' | 'change' | 'invalid'} phase
   */
  #handleInteraction(el, phase) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) {
      return;
    }

    if (!this.#supportsUserInvalid) {
      const state = this.#dirtyState.get(el) ?? { hasInteracted: false, hasBlurred: false };
      if (phase === 'invalid') {
        state.hasInteracted = true;
        state.hasBlurred = true;
      } else if (phase === 'input' || phase === 'change') {
        state.hasInteracted = true;
      } else if (phase === 'blur') {
        state.hasBlurred = true;
      }
      this.#dirtyState.set(el, state);

      if (phase === 'invalid' || (state.hasInteracted && state.hasBlurred)) {
        const valid = el.validity.valid;
        el.classList.toggle('user-invalid-fallback', !valid);
        el.classList.toggle('user-valid-fallback', valid);
      }
    }

    const shouldAnnounce = phase === 'blur' || phase === 'change';
    if (phase === 'input' && !el.hasAttribute('aria-invalid')) return;
    this.#syncAria(el, shouldAnnounce);
  }

  /**
   * @param {HTMLElement} el
   * @param {boolean} announce
   */
  #syncAria(el, announce) {
    if (!el.matches('input:not([type="hidden"]), select, textarea')) return;

    const isInvalid = this.#supportsUserInvalid
      ? el.matches(':user-invalid')
      : el.classList.contains('user-invalid-fallback');

    if (isInvalid) {
      if (announce && !this.#announced.has(el) && el instanceof HTMLInputElement) {
        liveAnnouncer.announce(el);
        this.#announced.add(el);
      }
      el.setAttribute('aria-invalid', 'true');
      this.#linkError(el, true);
      this.#flagged.add(el);
    } else if (this.#flagged.has(el) || el.getAttribute('aria-invalid') !== 'true') {
      el.setAttribute('aria-invalid', 'false');
      this.#linkError(el, false);
      this.#flagged.delete(el);
      this.#announced.delete(el);
      liveAnnouncer.clear(el);
    }
  }

  /**
   * @param {HTMLElement} el
   * @param {boolean} shown
   */
  #linkError(el, shown) {
    const errorId = el.dataset.error;
    if (!errorId) return;

    const ids = (el.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter((id) => id && id !== errorId);

    if (shown) ids.push(errorId);

    if (ids.length > 0) {
      el.setAttribute('aria-describedby', ids.join(' '));
    } else {
      el.removeAttribute('aria-describedby');
    }
  }
}

if (!customElements.get('wearox-notify-me')) {
  customElements.define('wearox-notify-me', WearoxNotifyMe);
}

