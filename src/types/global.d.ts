import type {
  FunctionDossier,
  CallGraphNode,
  CallGraphEdge,
  FunctionQueueEntry,
  AuditLogEntry,
  ProjectSnapshot
} from '../common/domain.js';
import type { CoreMessage } from 'ai';
import type { AgentChatResult, AgentToolCall, AgentToolResult } from '../main/agent/agent.js';

export interface ProjectAPI {
  getSnapshot(): Promise<ProjectSnapshot>;
  upsertFunction(dossier: FunctionDossier): Promise<ProjectSnapshot>;
  upsertGraphNode(node: CallGraphNode): Promise<ProjectSnapshot>;
  upsertGraphEdge(edge: CallGraphEdge): Promise<ProjectSnapshot>;
  replaceQueue(queue: FunctionQueueEntry[]): Promise<ProjectSnapshot>;
  appendAuditLog(entry: AuditLogEntry): Promise<ProjectSnapshot>;
}

export interface AgentAPI {
  chat(payload: { sessionId?: string; messages: CoreMessage[] }): Promise<{
    sessionId: string;
    result: AgentChatResult;
  }>;
  onTextDelta(handler: (payload: { sessionId: string; delta: string }) => void): () => void;
  onToolCall(handler: (payload: { sessionId: string; call: AgentToolCall }) => void): () => void;
  onToolResult(handler: (payload: { sessionId: string; result: AgentToolResult }) => void): () => void;
  onError(handler: (payload: { sessionId: string; error: { message: string; name?: string } }) => void): () => void;
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
    agentApi: AgentAPI;
  }
}
