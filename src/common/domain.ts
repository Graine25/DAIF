export type FunctionStatus = 'new' | 'imported' | 'reviewed' | 'queued' | 'placed';

export interface FunctionMetadata {
  id: string; // stable identifier from IDA (e.g., address)
  name: string;
  address: string;
  size: number | null;
  prototype?: string;
  tags: string[];
  status: FunctionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CrossReference {
  type: 'code' | 'data' | 'struct-field';
  direction: 'from' | 'to';
  symbol: string | null;
  address: string;
  comment?: string;
}

export interface FunctionSource {
  pseudocode: string | null;
  assembly: string | null;
  raw?: Record<string, unknown>; // extra MCP payload for future use
}

export interface FunctionAnalysis {
  summary: string | null;
  inputs: string[];
  outputs: string[];
  concerns: string[];
  suggestedFile?: string;
  confidence: number | null; // 0-1 range
}

export interface FunctionDossier {
  metadata: FunctionMetadata;
  source: FunctionSource;
  xrefs: CrossReference[];
  analysis: FunctionAnalysis;
}

export interface CallGraphNode {
  functionId: string;
  label: string;
  groupId: string | null;
  status: FunctionStatus;
}

export interface CallGraphEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  confidence: number | null;
}

export interface GraphGrouping {
  id: string;
  label: string;
  description?: string;
  type: 'file' | 'module' | 'custom';
}

export interface PlacementSuggestion {
  functionId: string;
  targetFile: string;
  rationale: string;
  supports: string[]; // references to graph nodes/edges supporting the suggestion
}

export interface FunctionQueueEntry {
  functionId: string;
  priority: number;
  blockedBy: string[];
  targetHint?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: 'human' | 'llm' | 'system';
  action: string;
  payload: Record<string, unknown>;
}

export interface ProjectSnapshot {
  functions: Record<string, FunctionDossier>;
  graph: {
    nodes: Record<string, CallGraphNode>;
    edges: Record<string, CallGraphEdge>;
    groups: Record<string, GraphGrouping>;
  };
  queue: FunctionQueueEntry[];
  placements: PlacementSuggestion[];
  auditLog: AuditLogEntry[];
}

export const emptyProjectSnapshot = (): ProjectSnapshot => ({
  functions: {},
  graph: {
    nodes: {},
    edges: {},
    groups: {}
  },
  queue: [],
  placements: [],
  auditLog: []
});
