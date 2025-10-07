import { randomUUID } from 'node:crypto';
import { tool } from 'ai';
import type { ProjectStore } from '../state/projectStore.js';
import {
  AnnotateFunctionInput,
  FetchFunctionInput,
  ListFunctionsInput,
  SummarizeAndPlaceInput,
  annotateFunctionInputSchema,
  fetchFunctionInputSchema,
  listFunctionsInputSchema,
  summarizeAndPlaceInputSchema
} from './schemas.js';
import type { McpIdaClient } from './mcpIdaClient.js';
import type {
  AuditLogEntry,
  CrossReference,
  FunctionAnalysis,
  FunctionDossier,
  FunctionMetadata,
  FunctionSource
} from '../../common/domain.js';

const makeDefaultMetadata = (id: string, timestamp: string): FunctionMetadata => ({
  id,
  name: id,
  address: id,
  size: null,
  prototype: undefined,
  tags: [],
  status: 'imported',
  createdAt: timestamp,
  updatedAt: timestamp
});

const makeDefaultSource = (): FunctionSource => ({
  pseudocode: null,
  assembly: null
});

const makeDefaultAnalysis = (): FunctionAnalysis => ({
  summary: null,
  inputs: [],
  outputs: [],
  concerns: [],
  suggestedFile: undefined,
  confidence: null
});

const coerceXrefType = (type: string): CrossReference['type'] => {
  if (type === 'code' || type === 'data' || type === 'struct-field') {
    return type;
  }

  return 'code';
};

const buildAuditEntry = (action: string, payload: Record<string, unknown>): AuditLogEntry => ({
  id: randomUUID(),
  timestamp: new Date().toISOString(),
  actor: 'llm',
  action,
  payload
});

type ToolDependencies = {
  store: ProjectStore;
  idaClient: McpIdaClient;
};

const handleListFunctions = async (
  deps: ToolDependencies,
  input: ListFunctionsInput
): Promise<{ inserted: number }> => {
  const { store, idaClient } = deps;
  const summaries = await idaClient.listFunctions(input);

  if (summaries.length === 0) {
    await store.appendAuditLog(
      buildAuditEntry('tool:listFunctions', {
        resultCount: 0,
        offset: input.offset,
        count: input.count
      })
    );

    return { inserted: 0 };
  }

  for (const summary of summaries) {
    const snapshot = store.getSnapshot();
    const existing = snapshot.functions[summary.ea];
    const now = new Date().toISOString();

    const metadata: FunctionMetadata = existing
      ? {
          ...existing.metadata,
          name: summary.name ?? existing.metadata.name,
          size: summary.size ?? existing.metadata.size,
          prototype: summary.prototype ?? existing.metadata.prototype,
          updatedAt: now
        }
      : {
          ...makeDefaultMetadata(summary.ea, now),
          name: summary.name ?? summary.ea,
          size: summary.size ?? null,
          prototype: summary.prototype ?? undefined
        };

    const dossier: FunctionDossier = {
      metadata,
      source: existing?.source ?? makeDefaultSource(),
      xrefs: existing?.xrefs ?? [],
      analysis: existing?.analysis ?? makeDefaultAnalysis()
    };

    await store.upsertFunction(dossier);
  }

  await store.appendAuditLog(
    buildAuditEntry('tool:listFunctions', {
      resultCount: summaries.length,
      offset: input.offset,
      count: input.count
    })
  );

  return { inserted: summaries.length };
};

const handleFetchFunction = async (
  deps: ToolDependencies,
  input: FetchFunctionInput
): Promise<{ ok: boolean }> => {
  const { store, idaClient } = deps;
  const detail = await idaClient.fetchFunction(input);

  if (!detail) {
    await store.appendAuditLog(
      buildAuditEntry('tool:fetchFunction', {
        ea: input.ea,
        result: 'skipped',
        reason: 'IDA MCP transport unavailable'
      })
    );
    return { ok: false };
  }

  const snapshot = store.getSnapshot();
  const existing = snapshot.functions[input.ea];
  const now = new Date().toISOString();

  const metadata: FunctionMetadata = existing
    ? {
        ...existing.metadata,
        name: detail.summary.name ?? existing.metadata.name,
        size: detail.summary.size ?? existing.metadata.size,
        prototype: detail.summary.prototype ?? existing.metadata.prototype,
        updatedAt: now
      }
    : {
        ...makeDefaultMetadata(input.ea, now),
        name: detail.summary.name ?? input.ea,
        size: detail.summary.size ?? null,
        prototype: detail.summary.prototype ?? undefined
      };

  const source: FunctionSource = {
    pseudocode: detail.pseudocode ?? existing?.source.pseudocode ?? null,
    assembly: detail.assembly ?? existing?.source.assembly ?? null,
    raw: {
      ...existing?.source.raw,
      ...detail.raw
    }
  };

  const xrefs: CrossReference[] = detail.xrefs.map((xref) => ({
    address: xref.address,
    direction: xref.direction === 'from' ? 'from' : 'to',
    type: coerceXrefType(xref.type),
    symbol: xref.symbol ?? null,
    comment: xref.comment ?? undefined
  }));

  const dossier: FunctionDossier = {
    metadata,
    source,
    xrefs,
    analysis: existing?.analysis ?? makeDefaultAnalysis()
  };

  await store.upsertFunction(dossier);
  await store.appendAuditLog(
    buildAuditEntry('tool:fetchFunction', {
      ea: input.ea,
      asmBytes: dossier.source.assembly?.length ?? 0,
      pseudoBytes: dossier.source.pseudocode?.length ?? 0,
      xrefCount: dossier.xrefs.length
    })
  );

  return { ok: true };
};

const handleAnnotateFunction = async (
  deps: ToolDependencies,
  input: AnnotateFunctionInput
): Promise<{ ok: boolean }> => {
  const { store, idaClient } = deps;
  await idaClient.annotateFunction(input);

  const snapshot = store.getSnapshot();
  const existing = snapshot.functions[input.ea];
  const now = new Date().toISOString();

  const metadata: FunctionMetadata = existing
    ? {
        ...existing.metadata,
        name: input.name ?? existing.metadata.name,
        prototype: input.prototype ?? existing.metadata.prototype,
        updatedAt: now
      }
    : {
        ...makeDefaultMetadata(input.ea, now),
        name: input.name ?? input.ea,
        prototype: input.prototype
      };

  const dossier: FunctionDossier = {
    metadata,
    source: existing?.source ?? makeDefaultSource(),
    xrefs: existing?.xrefs ?? [],
    analysis: existing?.analysis ?? makeDefaultAnalysis()
  };

  await store.upsertFunction(dossier);
  await store.appendAuditLog(
    buildAuditEntry('tool:annotateFunction', {
      ea: input.ea,
      name: input.name,
      prototype: input.prototype,
      comments: input.comments?.length ?? 0
    })
  );

  return { ok: true };
};

const handleSummarizeAndPlace = async (
  deps: ToolDependencies,
  input: SummarizeAndPlaceInput
): Promise<{ ok: boolean }> => {
  const { store } = deps;
  const snapshot = store.getSnapshot();
  const existing = snapshot.functions[input.ea];
  const now = new Date().toISOString();

  const metadata: FunctionMetadata = existing?.metadata
    ? { ...existing.metadata, updatedAt: now }
    : makeDefaultMetadata(input.ea, now);

  const analysis: FunctionAnalysis = {
    summary: input.summary,
    inputs: input.inputs,
    outputs: input.outputs,
    concerns: input.concerns,
    suggestedFile: input.suggestedFile ?? existing?.analysis.suggestedFile,
    confidence: input.confidence ?? existing?.analysis.confidence ?? null
  };

  const dossier: FunctionDossier = {
    metadata,
    source: existing?.source ?? makeDefaultSource(),
    xrefs: existing?.xrefs ?? [],
    analysis
  };

  await store.upsertFunction(dossier);
  await store.appendAuditLog(
    buildAuditEntry('tool:summarizeAndPlace', {
      ea: input.ea,
      suggestedFile: input.suggestedFile,
      confidence: input.confidence,
      inputs: input.inputs.length,
      outputs: input.outputs.length,
      concerns: input.concerns.length
    })
  );

  return { ok: true };
};

export const makeAgentTools = (deps: ToolDependencies) => ({
  listFunctions: tool({
    name: 'project.listFunctions',
    description: 'List IDA functions and sync metadata into the local project store.',
    inputSchema: listFunctionsInputSchema,
    execute: async (input) => handleListFunctions(deps, input)
  }),
  fetchFunction: tool({
    name: 'ida.fetchFunction',
    description: 'Fetch assembly, pseudocode, and cross-references for a function.',
    inputSchema: fetchFunctionInputSchema,
    execute: async (input) => handleFetchFunction(deps, input)
  }),
  annotateFunction: tool({
    name: 'ida.annotateFunction',
    description: 'Persist annotations back to IDA for a function.',
    inputSchema: annotateFunctionInputSchema,
    execute: async (input) => handleAnnotateFunction(deps, input)
  }),
  summarizeAndPlace: tool({
    name: 'project.summarizeAndPlace',
    description: 'Record semantic analysis and placement hints for a function.',
    inputSchema: summarizeAndPlaceInputSchema,
    execute: async (input) => handleSummarizeAndPlace(deps, input)
  })
});
