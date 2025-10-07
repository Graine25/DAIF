import { streamText, type CoreMessage, type LanguageModel, type TypedToolCall, type TypedToolResult, type FinishReason, type LanguageModelUsage } from 'ai';
import type { ProjectStore } from '../state/projectStore.js';
import type { McpIdaClient } from './mcpIdaClient.js';
import { makeAgentTools } from './tools.js';

export interface AgentConfig {
  model: LanguageModel;
  systemPrompt?: string;
}

export interface AgentChatCallbacks {
  onTextDelta?(delta: string): void;
  onToolCall?(call: AgentToolCall): void;
  onToolResult?(result: AgentToolResult): void;
  onError?(error: unknown): void;
}

export interface AgentChatResult {
  text: string;
  finishReason: FinishReason;
  usage: LanguageModelUsage;
  toolCalls: TypedToolCall<AgentToolset>[];
  toolResults: TypedToolResult<AgentToolset>[];
}

type AgentToolset = ReturnType<typeof makeAgentTools>;

export type AgentToolCall = TypedToolCall<AgentToolset>;
export type AgentToolResult = TypedToolResult<AgentToolset>;

export class AgentService {
  private readonly tools: AgentToolset;

  constructor(
    private readonly store: ProjectStore,
    private readonly idaClient: McpIdaClient,
    private readonly config: AgentConfig
  ) {
    this.tools = makeAgentTools({ store, idaClient });
  }

  async chat(messages: CoreMessage[], callbacks?: AgentChatCallbacks): Promise<AgentChatResult> {
    try {
      const result = await streamText({
        model: this.config.model,
        system: this.config.systemPrompt,
        messages,
        tools: this.tools,
        onChunk: ({ chunk }) => {
          switch (chunk.type) {
            case 'text-delta':
              callbacks?.onTextDelta?.(chunk.text);
              break;
            case 'tool-call':
              callbacks?.onToolCall?.(chunk as AgentToolCall);
              break;
            case 'tool-result':
              callbacks?.onToolResult?.(chunk as AgentToolResult);
              break;
            default:
              break;
          }
        },
        onError: (error) => {
          callbacks?.onError?.(error);
        }
      });

      const [text, finishReason, usage, toolCalls, toolResults] = await Promise.all([
        result.text,
        result.finishReason,
        result.totalUsage,
        result.toolCalls,
        result.toolResults
      ]);

      return {
        text,
        finishReason,
        usage,
        toolCalls,
        toolResults
      };
    } catch (error) {
      callbacks?.onError?.(error);
      throw error;
    }
  }
}
