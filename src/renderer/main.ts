import type {
  ProjectSnapshot,
  CallGraphNode,
  CallGraphEdge,
  GraphGrouping,
  FunctionQueueEntry,
  FunctionDossier
} from '../common/domain.js';

type TabId = 'function-analysis' | 'call-graph' | 'constructor';

class TabController {
  private tabs: Map<TabId, { button: HTMLButtonElement; panel: HTMLElement }> = new Map();
  private activeTab: TabId = 'function-analysis';

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

      this.tabs.set(id, { button, panel });
      button.addEventListener('click', () => this.onTabClick(id));
    });

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
    this.tabs.forEach(({ button, panel }, id) => {
      const isActive = id === this.activeTab;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
      panel.toggleAttribute('hidden', !isActive);
    });
  }
}

class CallGraphView {
  private readonly overviewEl = document.getElementById('call-graph-overview') as HTMLDListElement | null;
  private readonly groupsEl = document.getElementById('call-graph-groups') as HTMLUListElement | null;
  private readonly queueEl = document.getElementById('call-graph-queue') as HTMLOListElement | null;
  private readonly metaEl = document.getElementById('call-graph-meta') as HTMLDivElement | null;

  render(snapshot: ProjectSnapshot): void {
    if (!this.overviewEl || !this.groupsEl || !this.queueEl || !this.metaEl) {
      return;
    }

    const nodes = Object.values(snapshot.graph.nodes);
    const edges = Object.values(snapshot.graph.edges);
    const groups = Object.values(snapshot.graph.groups);
    const queue = snapshot.queue;

    this.renderOverview(nodes, edges, queue);
    this.renderGroups(groups, nodes);
    this.renderQueue(queue, snapshot.functions);
    this.renderMeta(nodes.length, edges.length, groups.length);
  }

  private renderOverview(
    nodes: CallGraphNode[],
    edges: CallGraphEdge[],
    queue: FunctionQueueEntry[]
  ): void {
    this.overviewEl!.innerHTML = '';

    const stats = [
      { label: 'Functions', value: nodes.length },
      { label: 'Call edges', value: edges.length },
      { label: 'Queued', value: queue.length }
    ];

    const fragment = document.createDocumentFragment();
    stats.forEach((stat) => {
      const dt = document.createElement('dt');
      dt.textContent = stat.label;
      const dd = document.createElement('dd');
      dd.textContent = String(stat.value);

      fragment.append(dt, dd);
    });

    this.overviewEl!.appendChild(fragment);
  }

  private renderGroups(groups: GraphGrouping[], nodes: CallGraphNode[]): void {
    this.groupsEl!.innerHTML = '';

    if (groups.length === 0) {
      this.groupsEl!.innerHTML = '<li class="empty-state">No groupings yet. Import functions to begin.</li>';
      return;
    }

    const nodeCountByGroup = nodes.reduce<Record<string, number>>((acc, node) => {
      if (node.groupId) {
        acc[node.groupId] = (acc[node.groupId] ?? 0) + 1;
      }
      return acc;
    }, {});

    const fragment = document.createDocumentFragment();

    groups.forEach((group) => {
      const count = nodeCountByGroup[group.id] ?? 0;
      const item = document.createElement('li');
      item.className = 'group-item';

      const title = document.createElement('p');
      title.className = 'group-item__title';
      title.textContent = group.label;

      const meta = document.createElement('p');
      meta.className = 'group-item__meta';
      meta.textContent = `${count} function${count === 1 ? '' : 's'}`;

      item.append(title, meta);

      if (group.description) {
        const description = document.createElement('p');
        description.className = 'group-item__meta';
        description.textContent = group.description;
        item.appendChild(description);
      }

      fragment.appendChild(item);
    });

    this.groupsEl!.appendChild(fragment);
  }

  private renderQueue(queue: FunctionQueueEntry[], functions: Record<string, FunctionDossier>): void {
    this.queueEl!.innerHTML = '';

    if (queue.length === 0) {
      this.queueEl!.innerHTML = '<li class="empty-state">Queue is empty. Review functions to queue them for placement.</li>';
      return;
    }

    const fragment = document.createDocumentFragment();

    queue
      .slice(0, 6)
      .sort((a, b) => a.priority - b.priority)
      .forEach((entry, index) => {
        const dossier = functions[entry.functionId];
        const item = document.createElement('li');
        item.className = 'queue-item';

        const title = document.createElement('h4');
        title.className = 'queue-item__title';
        title.textContent = dossier?.metadata.name ?? entry.functionId;

        const meta = document.createElement('p');
        meta.className = 'queue-item__meta';
        meta.innerHTML = [
          `#${index + 1}`,
          `Priority ${entry.priority}`,
          entry.blockedBy.length ? `Blocked by ${entry.blockedBy.length}` : 'Unblocked'
        ].join(' · ');

        item.append(title, meta);

        if (entry.targetHint || dossier?.analysis.suggestedFile) {
          const tags = document.createElement('div');
          tags.className = 'queue-item__tags';

          if (entry.targetHint) {
            const hint = document.createElement('span');
            hint.className = 'tag';
            hint.textContent = entry.targetHint;
            tags.appendChild(hint);
          }

          if (dossier?.analysis.suggestedFile) {
            const suggestion = document.createElement('span');
            suggestion.className = 'tag';
            suggestion.textContent = dossier.analysis.suggestedFile;
            tags.appendChild(suggestion);
          }

          item.appendChild(tags);
        }

        fragment.appendChild(item);
      });

    this.queueEl!.appendChild(fragment);
  }

  private renderMeta(nodeCount: number, edgeCount: number, groupCount: number): void {
    const pieces = [
      `${nodeCount} node${nodeCount === 1 ? '' : 's'}`,
      `${edgeCount} edge${edgeCount === 1 ? '' : 's'}`,
      `${groupCount} group${groupCount === 1 ? '' : 's'}`
    ];

    this.metaEl!.textContent = pieces.join(' • ');
  }
}

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

async function initializeProjectSnapshot(): Promise<void> {
  if (!window.projectApi) {
    return;
  }

  try {
    const snapshot = await window.projectApi.getSnapshot();
    const debugElement = document.getElementById('project-debug');
    if (debugElement) {
      const functionCount = Object.keys(snapshot.functions).length;
      const edgeCount = Object.keys(snapshot.graph.edges).length;
      debugElement.textContent = `Tracked functions: ${functionCount} · Call edges: ${edgeCount}`;
    }

    new CallGraphView().render(snapshot);
  } catch (error) {
    console.error('Failed to load project snapshot', error);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // Initialize UI tab interactions
  new TabController();
  updateRuntimeInfo();
  void initializeProjectSnapshot();
});
