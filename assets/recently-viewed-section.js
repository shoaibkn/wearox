import { RecentlyViewed } from '@theme/recently-viewed-products';
import { sectionRenderer } from '@theme/section-renderer';

/**
 * Hydrates a dedicated Recently Viewed Products section from localStorage via Shopify Section Rendering API.
 */
class WearoxRecentlyViewed extends HTMLElement {
  /** @type {AbortController | null} */
  #abortController = null;

  connectedCallback() {
    this.#abortController = new AbortController();
    const { signal } = this.#abortController;

    const clearBtn = this.querySelector('[data-recently-viewed-clear]');
    clearBtn?.addEventListener('click', this.#handleClear, { signal });

    void this.#hydrate();
  }

  disconnectedCallback() {
    this.#abortController?.abort();
    this.#abortController = null;
  }

  #handleClear = () => {
    RecentlyViewed.clearProducts();
    this.hidden = true;
  };

  async #hydrate() {
    const sectionId = this.dataset.sectionId;
    const grid = this.querySelector('[data-recently-viewed-grid]');
    if (!sectionId || !(grid instanceof HTMLElement)) return;

    const currentProductId = this.dataset.currentProductId || '';
    const maxProducts = Number(this.dataset.maxProducts) || 4;

    const viewedIds = RecentlyViewed.getProducts()
      .filter((id) => id && id !== currentProductId)
      .slice(0, maxProducts);

    if (viewedIds.length === 0) {
      this.hidden = true;
      return;
    }

    try {
      const url = new URL(Theme.routes.search_url, window.location.origin);
      url.searchParams.set('q', viewedIds.map((id) => `id:${id}`).join(' OR '));
      url.searchParams.set('type', 'product');

      const html = await sectionRenderer.getSectionHTML(sectionId, false, url);
      if (this.#abortController?.signal.aborted) return;

      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const items = Array.from(parsed.querySelectorAll('[data-recently-viewed-item]'));
      if (items.length === 0) {
        this.hidden = true;
        return;
      }

      /** @type {Map<string, Element>} */
      const byId = new Map();
      for (const item of items) {
        const pid = item.getAttribute('data-product-id');
        if (pid) byId.set(pid, item);
      }

      grid.replaceChildren();
      let appended = 0;
      for (const id of viewedIds) {
        const match = byId.get(id);
        if (match) {
          grid.appendChild(match);
          appended++;
        }
      }

      if (appended > 0) {
        this.hidden = false;
      }
    } catch {
      this.hidden = true;
    }
  }
}

if (!customElements.get('wearox-recently-viewed')) {
  customElements.define('wearox-recently-viewed', WearoxRecentlyViewed);
}
