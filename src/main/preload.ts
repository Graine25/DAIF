import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type {
  ProjectSnapshot,
  FunctionDossier,
  CallGraphNode,
  CallGraphEdge,
  FunctionQueueEntry,
  AuditLogEntry
} from '../common/domain.js';

import { PROJECT_CHANNELS } from './ipc/projectIpc.js';
import { AGENT_CHANNELS, AGENT_EVENTS } from './ipc/agentIpc.js';
import type { CoreMessage } from 'ai';
import type { AgentChatResult, AgentToolCall, AgentToolResult } from './agent/agent.js';

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

type AgentChatPayload = {
  sessionId?: string;
  messages: CoreMessage[];
};

type AgentChatResponse = {
  sessionId: string;
  result: AgentChatResult;
};

const registerListener = <T>(channel: string, handler: (payload: T) => void): (() => void) => {
  const listener = (_event: IpcRendererEvent, payload: T) => {
    handler(payload);
  };

  ipcRenderer.on(channel, listener);

  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
};

const agentApi = {
  chat: (payload: AgentChatPayload): Promise<AgentChatResponse> =>
    ipcRenderer.invoke(AGENT_CHANNELS.chat, payload),
  onTextDelta: (handler: (payload: { sessionId: string; delta: string }) => void): (() => void) =>
    registerListener(AGENT_EVENTS.textDelta, handler),
  onToolCall: (handler: (payload: { sessionId: string; call: AgentToolCall }) => void): (() => void) =>
    registerListener(AGENT_EVENTS.toolCall, handler),
  onToolResult: (
    handler: (payload: { sessionId: string; result: AgentToolResult }) => void
  ): (() => void) => registerListener(AGENT_EVENTS.toolResult, handler),
  onError: (handler: (payload: { sessionId: string; error: { message: string; name?: string } }) => void): (() => void) =>
    registerListener(AGENT_EVENTS.error, handler)
};

contextBridge.exposeInMainWorld('agentApi', agentApi);

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.setAttribute('data-platform', process.platform);
});
