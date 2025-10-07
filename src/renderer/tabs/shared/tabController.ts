export type TabId = 'chat' | 'function-analysis' | 'call-graph' | 'constructor';

export class TabController {
  private readonly tabs = new Map<TabId, { button: HTMLButtonElement; panel: HTMLElement }>();
  private activeTab: TabId | null = null;

  constructor() {
    const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-button');
    const tabPanels = document.querySelectorAll<HTMLElement>('.tab-panel');

    tabButtons.forEach((button) => {
      const id = button.dataset.tab as TabId | undefined;
      if (!id) {
        return;
      }

      const panel = Array.from(tabPanels).find((section) => section.dataset.tab === id);
      if (!panel) {
        return;
      }

      button.type = 'button';
      this.tabs.set(id, { button, panel });

      if (
        button.classList.contains('is-active') ||
        button.getAttribute('aria-selected') === 'true'
      ) {
        this.activeTab = id;
      }

      button.addEventListener('click', () => this.onTabClick(id));
    });

    if (!this.activeTab) {
      const firstEntry = this.tabs.keys().next();
      if (!firstEntry.done) {
        this.activeTab = firstEntry.value;
      }
    }

    this.applyActiveState();
  }

  private onTabClick(id: TabId): void {
    if (id === this.activeTab) {
      return;
    }

    this.activeTab = id;
    this.applyActiveState();
  }

  private applyActiveState(): void {
    const activeTab = this.activeTab;

    this.tabs.forEach(({ button, panel }, id) => {
      const isActive = id === activeTab;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
      button.setAttribute('tabindex', isActive ? '0' : '-1');

      panel.hidden = !isActive;
      panel.setAttribute('aria-hidden', String(!isActive));
      panel.classList.toggle('is-active', isActive);
    });
  }
}
