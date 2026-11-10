import { CartLinesUpdateEvent, CartErrorEvent } from '@shopify/events';
import { fetchConfig } from '@theme/utilities';

/**
 * Interactive cart drawer cross-sell rail with variant add-to-cart and scroll-fade fallback.
 */
class WearoxCartUpsells extends HTMLElement {
  /** @type {AbortController | null} */
  #abortController = null;

  /** @type {IntersectionObserver | null} */
  #scrollObserver = null;

  connectedCallback() {
    this.#abortController = new AbortController();
    const { signal } = this.#abortController;

    this.addEventListener('submit', this.#handleSubmit, { signal });
    this.#setupScrollFadeFallback();
  }

  disconnectedCallback() {
    this.#abortController?.abort();
    this.#abortController = null;
    this.#scrollObserver?.disconnect();
    this.#scrollObserver = null;
  }

  #setupScrollFadeFallback() {
    if (typeof CSS !== 'undefined' && CSS.supports('animation-timeline', 'scroll()')) return;

    const scroller = this.querySelector('.cart-upsells__list');
    if (!(scroller instanceof HTMLElement)) return;

    const first = scroller.firstElementChild;
    const last = scroller.lastElementChild;
    if (!first || !last || first === last) return;

    this.#scrollObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === first) {
            scroller.classList.toggle('more-start', entry.intersectionRatio < 1);
          } else if (entry.target === last) {
            scroller.classList.toggle('more-end', entry.intersectionRatio < 1);
          }
        }
      },
      { root: scroller, threshold: 1, rootMargin: '1px' }
    );

    this.#scrollObserver.observe(first);
    this.#scrollObserver.observe(last);
  }

  /** @param {SubmitEvent} event */
  #handleSubmit = async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.matches('.cart-upsells__form')) return;

    event.preventDefault();

    const submitButton = /** @type {HTMLButtonElement | null} */ (
      form.querySelector('button[type="submit"]')
    );
    const errorEl = form.querySelector('.cart-upsells__error');
    if (errorEl instanceof HTMLElement) {
      errorEl.hidden = true;
      errorEl.textContent = '';
    }

    const formData = new FormData(form);
    const variantId = String(formData.get('id') || '');
    if (!variantId) return;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute('aria-busy', 'true');
    }

    const sectionIds = [];
    for (const el of document.querySelectorAll('cart-items-component')) {
      if (el instanceof HTMLElement && el.dataset.sectionId) {
        sectionIds.push(el.dataset.sectionId);
      }
    }
    if (sectionIds.length > 0) {
      formData.append('sections', sectionIds.join(','));
    }

    const deferred = CartLinesUpdateEvent.createPromise();

    this.dispatchEvent(
      new CartLinesUpdateEvent({
        action: 'add',
        context: 'cart',
        lines: [{ merchandiseId: variantId, quantity: 1 }],
        promise: deferred.promise,
      })
    );

    try {
      const fetchCfg = fetchConfig('javascript', { body: formData });
      const addRes = await fetch(Theme.routes.cart_add_url, {
        ...fetchCfg,
        headers: {
          ...fetchCfg.headers,
          Accept: 'text/html',
        },
      });
      const addData = await addRes.json();

      if (addData.status) {
        const message = String(addData.description || addData.message || 'Could not add item');
        if (errorEl instanceof HTMLElement) {
          errorEl.textContent = message;
          errorEl.hidden = false;
        }
        this.dispatchEvent(
          new CartErrorEvent({
            error: message,
            code: 'INVALID',
          })
        );
        const cartRes = await fetch(`${Theme.routes.cart_url}.json`, {
          headers: { Accept: 'application/json' },
          credentials: 'same-origin',
        });
        const ajaxCart = await cartRes.json();
        deferred.resolve({
          cart: CartLinesUpdateEvent.createCartFromAjaxResponse(ajaxCart),
          detail: {
            didError: true,
            items: ajaxCart.items,
            source: 'wearox-cart-upsells',
          },
        });
        return;
      }

      const cartRes = await fetch(`${Theme.routes.cart_url}.json`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      const ajaxCart = await cartRes.json();
      deferred.resolve({
        cart: CartLinesUpdateEvent.createCartFromAjaxResponse(ajaxCart),
        detail: {
          didError: false,
          items: ajaxCart.items,
          sections: addData.sections,
          source: 'wearox-cart-upsells',
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Network error adding item';
      deferred.reject(error);
      if (errorEl instanceof HTMLElement) {
        errorEl.textContent = msg;
        errorEl.hidden = false;
      }
      this.dispatchEvent(
        new CartErrorEvent({
          error: msg,
          code: 'SERVICE_UNAVAILABLE',
        })
      );
    } finally {
      if (submitButton && submitButton.isConnected) {
        submitButton.disabled = false;
        submitButton.removeAttribute('aria-busy');
      }
    }
  };
}

if (!customElements.get('wearox-cart-upsells')) {
  customElements.define('wearox-cart-upsells', WearoxCartUpsells);
}
