import type {
  FunctionDossier,
  CallGraphNode,
  CallGraphEdge,
  FunctionQueueEntry,
  AuditLogEntry,
  ProjectSnapshot
} from '../common/domain.js';

export interface ProjectAPI {
  getSnapshot(): Promise<ProjectSnapshot>;
  upsertFunction(dossier: FunctionDossier): Promise<ProjectSnapshot>;
  upsertGraphNode(node: CallGraphNode): Promise<ProjectSnapshot>;
  upsertGraphEdge(edge: CallGraphEdge): Promise<ProjectSnapshot>;
  replaceQueue(queue: FunctionQueueEntry[]): Promise<ProjectSnapshot>;
  appendAuditLog(entry: AuditLogEntry): Promise<ProjectSnapshot>;
}

export {};

declare global {
  interface Window {
    axelEnv: {
      platform: NodeJS.Platform;
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };
    };
    projectApi: ProjectAPI;
  }
}
