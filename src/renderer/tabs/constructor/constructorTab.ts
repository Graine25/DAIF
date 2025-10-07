export class ConstructorTab {
  private readonly panel = document.querySelector<HTMLElement>(".tab-panel[data-tab='constructor']");

  constructor() {
    // placeholder for constructor workspace wiring
  }

  activate(): void {
    if (!this.panel) {
      return;
    }

    // hook for future enhancements
  }
}
