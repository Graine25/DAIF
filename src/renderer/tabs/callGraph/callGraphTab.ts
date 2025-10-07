import type {
  ProjectSnapshot,
  CallGraphNode,
  CallGraphEdge,
  GraphGrouping,
  FunctionQueueEntry,
  FunctionDossier
} from '../../../common/domain.js';

const getElement = <T extends HTMLElement>(selector: string): T | null => {
  return document.querySelector<T>(selector);
};

export class CallGraphTab {
  private readonly overviewEl = getElement<HTMLDListElement>('#call-graph-overview');
  private readonly groupsEl = getElement<HTMLUListElement>('#call-graph-groups');
  private readonly queueEl = getElement<HTMLOListElement>('#call-graph-queue');
  private readonly metaEl = getElement<HTMLDivElement>('#call-graph-meta');

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
    if (!this.overviewEl) {
      return;
    }

    this.overviewEl.innerHTML = '';

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

    this.overviewEl.appendChild(fragment);
  }

  private renderGroups(groups: GraphGrouping[], nodes: CallGraphNode[]): void {
    if (!this.groupsEl) {
      return;
    }

    this.groupsEl.innerHTML = '';

    if (groups.length === 0) {
      this.groupsEl.innerHTML =
        '<li class="empty-state">No groupings yet. Import functions to begin.</li>';
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

    this.groupsEl.appendChild(fragment);
  }

  private renderQueue(queue: FunctionQueueEntry[], functions: Record<string, FunctionDossier>): void {
    if (!this.queueEl) {
      return;
    }

    this.queueEl.innerHTML = '';

    if (queue.length === 0) {
      this.queueEl.innerHTML =
        '<li class="empty-state">Queue is empty. Review functions to queue them for placement.</li>';
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

    this.queueEl.appendChild(fragment);
  }

  private renderMeta(nodeCount: number, edgeCount: number, groupCount: number): void {
    if (!this.metaEl) {
      return;
    }

    const pieces = [
      `${nodeCount} node${nodeCount === 1 ? '' : 's'}`,
      `${edgeCount} edge${edgeCount === 1 ? '' : 's'}`,
      `${groupCount} group${groupCount === 1 ? '' : 's'}`
    ];

    this.metaEl.textContent = pieces.join(' • ');
  }
}
