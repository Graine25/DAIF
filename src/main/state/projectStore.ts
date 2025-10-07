import { promises as fs } from 'node:fs';
import path from 'node:path';
import { emptyProjectSnapshot, ProjectSnapshot, FunctionDossier, CallGraphNode, CallGraphEdge, FunctionQueueEntry, AuditLogEntry } from '../../common/domain.js';
import { ensureDaifStructure, getDaifPaths } from '../filesystem/daifPaths.js';

export interface ProjectStore {
  load(): Promise<ProjectSnapshot>;
  save(snapshot: ProjectSnapshot): Promise<void>;
  getSnapshot(): ProjectSnapshot;
  upsertFunction(dossier: FunctionDossier): Promise<ProjectSnapshot>;
  upsertGraphNode(node: CallGraphNode): Promise<ProjectSnapshot>;
  upsertGraphEdge(edge: CallGraphEdge): Promise<ProjectSnapshot>;
  replaceQueue(queue: FunctionQueueEntry[]): Promise<ProjectSnapshot>;
  appendAuditLog(entry: AuditLogEntry): Promise<ProjectSnapshot>;
}

export class JsonProjectStore implements ProjectStore {
  private snapshot: ProjectSnapshot = emptyProjectSnapshot();
  private readonly storePath: string;

  constructor(filename = 'axel-project.json') {
    const { decomp } = getDaifPaths();
    this.storePath = path.join(decomp, filename);
  }

  async load(): Promise<ProjectSnapshot> {
    await ensureDaifStructure();
    try {
      const raw = await fs.readFile(this.storePath, 'utf8');
      this.snapshot = JSON.parse(raw) as ProjectSnapshot;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.snapshot = emptyProjectSnapshot();
        await this.save(this.snapshot);
      } else {
        throw error;
      }
    }

    return this.snapshot;
  }

  async save(snapshot: ProjectSnapshot): Promise<void> {
    const paths = await ensureDaifStructure();
    this.snapshot = snapshot;
    await fs.writeFile(this.storePath, JSON.stringify(snapshot, null, 2), 'utf8');
    await writeFlowchartSnapshot(paths.flowchart, snapshot);
  }

  getSnapshot(): ProjectSnapshot {
    return this.snapshot;
  }

  async upsertFunction(dossier: FunctionDossier): Promise<ProjectSnapshot> {
    const snapshot = structuredClone(this.snapshot);
    snapshot.functions[dossier.metadata.id] = dossier;
    await this.save(snapshot);
    return snapshot;
  }

  async upsertGraphNode(node: CallGraphNode): Promise<ProjectSnapshot> {
    const snapshot = structuredClone(this.snapshot);
    snapshot.graph.nodes[node.functionId] = node;
    await this.save(snapshot);
    return snapshot;
  }

  async upsertGraphEdge(edge: CallGraphEdge): Promise<ProjectSnapshot> {
    const snapshot = structuredClone(this.snapshot);
    snapshot.graph.edges[edge.id] = edge;
    await this.save(snapshot);
    return snapshot;
  }

  async replaceQueue(queue: FunctionQueueEntry[]): Promise<ProjectSnapshot> {
    const snapshot = structuredClone(this.snapshot);
    snapshot.queue = queue;
    await this.save(snapshot);
    return snapshot;
  }

  async appendAuditLog(entry: AuditLogEntry): Promise<ProjectSnapshot> {
    const snapshot = structuredClone(this.snapshot);
    snapshot.auditLog.push(entry);
    await this.save(snapshot);
    return snapshot;
  }
}

const writeFlowchartSnapshot = async (directory: string, snapshot: ProjectSnapshot): Promise<void> => {
  const flowchartPayload = {
    updatedAt: new Date().toISOString(),
    graph: snapshot.graph
  };

  const targetPath = path.join(directory, 'call-graph.json');
  await fs.writeFile(targetPath, JSON.stringify(flowchartPayload, null, 2), 'utf8');
};
