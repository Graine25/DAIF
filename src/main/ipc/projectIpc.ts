import { ipcMain } from 'electron';
import { ProjectStore } from '../state/projectStore.js';
import {
  CallGraphEdge,
  CallGraphNode,
  FunctionDossier,
  FunctionQueueEntry,
  ProjectSnapshot,
  AuditLogEntry
} from '../../common/domain.js';

export const PROJECT_CHANNELS = {
  getSnapshot: 'project:getSnapshot',
  upsertFunction: 'project:upsertFunction',
  upsertGraphNode: 'project:upsertGraphNode',
  upsertGraphEdge: 'project:upsertGraphEdge',
  replaceQueue: 'project:replaceQueue',
  appendAuditLog: 'project:appendAuditLog'
} as const;

type ChannelValue<T extends keyof typeof PROJECT_CHANNELS> = (typeof PROJECT_CHANNELS)[T];

export const registerProjectIpc = (store: ProjectStore): void => {
  ipcMain.handle(PROJECT_CHANNELS.getSnapshot, async (): Promise<ProjectSnapshot> => {
    return store.getSnapshot();
  });

  ipcMain.handle(
    PROJECT_CHANNELS.upsertFunction,
    async (_event, dossier: FunctionDossier): Promise<ProjectSnapshot> => {
      return store.upsertFunction(dossier);
    }
  );

  ipcMain.handle(
    PROJECT_CHANNELS.upsertGraphNode,
    async (_event, node: CallGraphNode): Promise<ProjectSnapshot> => {
      return store.upsertGraphNode(node);
    }
  );

  ipcMain.handle(
    PROJECT_CHANNELS.upsertGraphEdge,
    async (_event, edge: CallGraphEdge): Promise<ProjectSnapshot> => {
      return store.upsertGraphEdge(edge);
    }
  );

  ipcMain.handle(
    PROJECT_CHANNELS.replaceQueue,
    async (_event, queue: FunctionQueueEntry[]): Promise<ProjectSnapshot> => {
      return store.replaceQueue(queue);
    }
  );

  ipcMain.handle(
    PROJECT_CHANNELS.appendAuditLog,
    async (_event, entry: AuditLogEntry): Promise<ProjectSnapshot> => {
      return store.appendAuditLog(entry);
    }
  );
};

export type ProjectChannel = ChannelValue<keyof typeof PROJECT_CHANNELS>;
