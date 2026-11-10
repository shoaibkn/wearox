/**
 * Live countdown timer for numbered WEAROX streetwear drops.
 */
class WearoxDropCountdown extends HTMLElement {
  /** @type {number | undefined} */
  #intervalId;

  /** @type {number} */
  #targetMs = 0;

  connectedCallback() {
    const targetIso = this.dataset.targetDate;
    if (!targetIso) return;

    const parsed = Date.parse(targetIso);
    if (Number.isNaN(parsed)) return;

    this.#targetMs = parsed;
    this.#update();

    if (this.#targetMs > Date.now()) {
      this.#intervalId = window.setInterval(() => this.#update(), 1000);
    }
  }

  disconnectedCallback() {
    if (this.#intervalId !== undefined) {
      window.clearInterval(this.#intervalId);
      this.#intervalId = undefined;
    }
  }

  #update() {
    const diff = Math.max(0, this.#targetMs - Date.now());
    const daysEl = this.querySelector('[data-unit="days"]');
    const hoursEl = this.querySelector('[data-unit="hours"]');
    const minsEl = this.querySelector('[data-unit="minutes"]');
    const secsEl = this.querySelector('[data-unit="seconds"]');
    const liveBanner = this.querySelector('[data-drop-live]');
    const gridEl = this.querySelector('[data-drop-grid]');

    if (diff === 0) {
      if (this.#intervalId !== undefined) {
        window.clearInterval(this.#intervalId);
        this.#intervalId = undefined;
      }
      if (gridEl instanceof HTMLElement) gridEl.hidden = true;
      if (liveBanner instanceof HTMLElement) liveBanner.hidden = false;
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minsEl) minsEl.textContent = String(minutes).padStart(2, '0');
    if (secsEl) secsEl.textContent = String(seconds).padStart(2, '0');
  }
}

if (!customElements.get('wearox-drop-countdown')) {
  customElements.define('wearox-drop-countdown', WearoxDropCountdown);
}
