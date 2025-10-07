import type { ProjectSnapshot } from '../common/domain.js';
import { TabController } from './tabs/shared/tabController.js';
import { ChatTab } from './tabs/chat/index.js';
import { CallGraphTab } from './tabs/callGraph/index.js';
import { FunctionAnalysisTab } from './tabs/functionAnalysis/index.js';
import { ConstructorTab } from './tabs/constructor/index.js';

let callGraphTab: CallGraphTab | null = null;
const refreshProjectSnapshot = async (): Promise<void> => {
  if (!window.projectApi) {
    return;
  }

  try {
    const snapshot = await window.projectApi.getSnapshot();
    applySnapshot(snapshot);
  } catch (error) {
    console.error('Failed to load project snapshot', error);
  }
};

const applySnapshot = (snapshot: ProjectSnapshot): void => {
  callGraphTab?.render(snapshot);
};

function updateRuntimeInfo(): void {
  const runtimeInfo = document.getElementById('runtime-info');
  if (!runtimeInfo || !window.axelEnv) {
    return;
  }

  const { platform, versions } = window.axelEnv;
  runtimeInfo.innerHTML = [
    `Platform: <strong>${platform}</strong>`,
    `Electron: <strong>${versions.electron}</strong>`
  ].join('<br />');
}

window.addEventListener('DOMContentLoaded', () => {
  new TabController();

  callGraphTab = new CallGraphTab();
  new ChatTab(() => refreshProjectSnapshot());

  new FunctionAnalysisTab();
  new ConstructorTab();

  updateRuntimeInfo();
  void refreshProjectSnapshot();
});
