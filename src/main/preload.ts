import { contextBridge, ipcRenderer } from 'electron';
import type {
  ProjectSnapshot,
  FunctionDossier,
  CallGraphNode,
  CallGraphEdge,
  FunctionQueueEntry,
  AuditLogEntry
} from '../common/domain.js';

import { PROJECT_CHANNELS } from './ipc/projectIpc.js';

type RuntimeVersions = {
  node: string;
  chrome: string;
  electron: string;
};

type AxelEnvironment = {
  platform: NodeJS.Platform;
  versions: RuntimeVersions;
};

const axelEnv: AxelEnvironment = {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
};

contextBridge.exposeInMainWorld('axelEnv', axelEnv);

const projectApi = {
  getSnapshot: (): Promise<ProjectSnapshot> => ipcRenderer.invoke(PROJECT_CHANNELS.getSnapshot),
  upsertFunction: (dossier: FunctionDossier): Promise<ProjectSnapshot> =>
    ipcRenderer.invoke(PROJECT_CHANNELS.upsertFunction, dossier),
  upsertGraphNode: (node: CallGraphNode): Promise<ProjectSnapshot> =>
    ipcRenderer.invoke(PROJECT_CHANNELS.upsertGraphNode, node),
  upsertGraphEdge: (edge: CallGraphEdge): Promise<ProjectSnapshot> =>
    ipcRenderer.invoke(PROJECT_CHANNELS.upsertGraphEdge, edge),
  replaceQueue: (queue: FunctionQueueEntry[]): Promise<ProjectSnapshot> =>
    ipcRenderer.invoke(PROJECT_CHANNELS.replaceQueue, queue),
  appendAuditLog: (entry: AuditLogEntry): Promise<ProjectSnapshot> =>
    ipcRenderer.invoke(PROJECT_CHANNELS.appendAuditLog, entry)
};

contextBridge.exposeInMainWorld('projectApi', projectApi);

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.setAttribute('data-platform', process.platform);
});
