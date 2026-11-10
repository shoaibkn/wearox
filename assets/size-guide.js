/**
 * Accessible tabbed size chart controller for the WEAROX size guide modal.
 */
class WearoxSizeTabs extends HTMLElement {
  /** @type {AbortController | null} */
  #abortController = null;

  connectedCallback() {
    this.#abortController = new AbortController();
    const { signal } = this.#abortController;

    const tabs = /** @type {HTMLButtonElement[]} */ (
      Array.from(this.querySelectorAll('[role="tab"]'))
    );
    const panels = /** @type {HTMLElement[]} */ (
      Array.from(this.querySelectorAll('[role="tabpanel"]'))
    );

    if (tabs.length === 0 || panels.length === 0) return;

    /**
     * Activates the requested tab and updates panel visibility.
     * @param {HTMLButtonElement} selectedTab
     * @param {boolean} [moveFocus]
     */
    const selectTab = (selectedTab, moveFocus = false) => {
      const targetPanelId = selectedTab.dataset.panel;
      if (!targetPanelId) return;

      for (const tab of tabs) {
        const isSelected = tab === selectedTab;
        tab.setAttribute('aria-selected', String(isSelected));
        tab.tabIndex = isSelected ? 0 : -1;
      }

      for (const panel of panels) {
        const isTarget = panel.id === targetPanelId;
        if (isTarget) {
          panel.removeAttribute('hidden');
          panel.tabIndex = 0;
        } else {
          panel.setAttribute('hidden', 'until-found');
          panel.removeAttribute('tabindex');
        }
      }

      selectedTab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (moveFocus) {
        selectedTab.focus();
      }
    };

    for (const tab of tabs) {
      tab.addEventListener(
        'click',
        () => {
          selectTab(tab);
        },
        { signal }
      );

      tab.addEventListener(
        'keydown',
        (event) => {
          const currentIndex = tabs.indexOf(tab);
          if (currentIndex === -1) return;

          let nextIndex = -1;
          if (event.key === 'ArrowRight') {
            nextIndex = (currentIndex + 1) % tabs.length;
          } else if (event.key === 'ArrowLeft') {
            nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          } else if (event.key === 'Home') {
            nextIndex = 0;
          } else if (event.key === 'End') {
            nextIndex = tabs.length - 1;
          }

          if (nextIndex === -1) return;

          const nextTab = tabs[nextIndex];
          if (!nextTab) return;

          event.preventDefault();
          selectTab(nextTab, true);
        },
        { signal }
      );
    }

    for (const panel of panels) {
      panel.addEventListener(
        'beforematch',
        () => {
          const matchingTab = tabs.find((tab) => tab.dataset.panel === panel.id);
          if (matchingTab) {
            selectTab(matchingTab);
          }
        },
        { signal }
      );
    }
  }

  disconnectedCallback() {
    this.#abortController?.abort();
    this.#abortController = null;
  }
}

if (!customElements.get('wearox-size-tabs')) {
  customElements.define('wearox-size-tabs', WearoxSizeTabs);
}
