import type {
  AnnotateFunctionInput,
  FetchFunctionInput,
  ListFunctionsInput
} from './schemas.js';

export interface McpTransport {
  call<TResponse>(method: string, params?: Record<string, unknown>): Promise<TResponse>;
}

export interface IdaFunctionSummary {
  ea: string;
  name: string;
  size: number | null;
  prototype?: string | null;
}

export interface IdaFunctionXref {
  address: string;
  direction: 'from' | 'to';
  type: 'code' | 'data' | 'struct-field' | string;
  symbol?: string | null;
  comment?: string | null;
}

export interface IdaFunctionDetail {
  summary: IdaFunctionSummary;
  assembly: string | null;
  pseudocode: string | null;
  xrefs: IdaFunctionXref[];
  raw?: Record<string, unknown>;
}

export class McpIdaClient {
  constructor(private readonly transport: McpTransport | null) {}

  get isConnected(): boolean {
    return Boolean(this.transport);
  }

  async listFunctions(input: ListFunctionsInput): Promise<IdaFunctionSummary[]> {
    if (!this.transport) {
      // Gracefully degrade while the MCP backend is unavailable.
      return [];
    }

    const response = await this.transport.call<{ functions: IdaFunctionSummary[] }>(
      'ida.list_functions',
      {
        offset: input.offset,
        count: input.count
      }
    );

    return response.functions ?? [];
  }

  async fetchFunction(input: FetchFunctionInput): Promise<IdaFunctionDetail | null> {
    if (!this.transport) {
      return null;
    }

    const [assembly, pseudocode, xrefs] = await Promise.all([
      this.transport.call<{ asm: string | null }>('ida.disassemble_function', { ea: input.ea }),
      this.transport.call<{ pseudocode: string | null }>('ida.decompile_function', { ea: input.ea }),
      this.transport.call<{ xrefs: IdaFunctionXref[] }>('ida.get_xrefs_to', { ea: input.ea })
    ]);

    return {
      summary: {
        ea: input.ea,
        name: input.ea,
        size: null
      },
      assembly: assembly.asm ?? null,
      pseudocode: pseudocode.pseudocode ?? null,
      xrefs: xrefs.xrefs ?? [],
      raw: {
        disassembleResponse: assembly,
        decompileResponse: pseudocode,
        xrefsResponse: xrefs
      }
    } satisfies IdaFunctionDetail;
  }

  async annotateFunction(input: AnnotateFunctionInput): Promise<void> {
    if (!this.transport) {
      return;
    }

    await this.transport.call('ida.annotate_function', {
      ea: input.ea,
      name: input.name,
      prototype: input.prototype,
      comments: input.comments
    });
  }
}
