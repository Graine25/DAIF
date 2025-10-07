import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ipcMain } from 'electron';
import type { CoreMessage } from 'ai';
import type { AgentService, AgentChatResult } from '../agent/agent.js';
import { ensureDaifStructure } from '../filesystem/daifPaths.js';

export const AGENT_CHANNELS = {
  chat: 'agent:chat'
} as const;

export const AGENT_EVENTS = {
  textDelta: 'agent:chat:text-delta',
  toolCall: 'agent:chat:tool-call',
  toolResult: 'agent:chat:tool-result',
  error: 'agent:chat:error'
} as const;

type AgentChatPayload = {
  sessionId?: string;
  messages: CoreMessage[];
};

export const registerAgentIpc = (agent: AgentService): void => {
  ipcMain.handle(AGENT_CHANNELS.chat, async (event, payload: AgentChatPayload) => {
    const { sender } = event;
    const sessionId = payload.sessionId ?? randomUUID();

    try {
      const result = await agent.chat(payload.messages, {
        onTextDelta: (delta) => {
          sender.send(AGENT_EVENTS.textDelta, { sessionId, delta });
        },
        onToolCall: (call) => {
          sender.send(AGENT_EVENTS.toolCall, { sessionId, call });
        },
        onToolResult: (toolResult) => {
          sender.send(AGENT_EVENTS.toolResult, { sessionId, result: toolResult });
        },
        onError: (error) => {
          sender.send(AGENT_EVENTS.error, { sessionId, error: serializeError(error) });
        }
      });

      persistChatLog(sessionId, payload.messages, result).catch((persistError) => {
        console.error('[axel] Failed to persist chat log', persistError);
      });

      return { sessionId, result };
    } catch (error) {
      sender.send(AGENT_EVENTS.error, { sessionId, error: serializeError(error) });
      throw error;
    }
  });
};

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
  }

  return { message: String(error) };
};

const persistChatLog = async (
  sessionId: string,
  messages: CoreMessage[],
  result: AgentChatResult
): Promise<void> => {
  const paths = await ensureDaifStructure();
  const timestamp = new Date();
  const sanitized = timestamp.toISOString().replace(/[:]/g, '-');
  const filename = `${sanitized}-${sessionId}.json`;
  const filePath = path.join(paths.chats, filename);

  const logPayload = {
    sessionId,
    timestamp: timestamp.toISOString(),
    messages,
    response: {
      text: result.text,
      finishReason: result.finishReason,
      usage: result.usage,
      toolCalls: result.toolCalls,
      toolResults: result.toolResults
    }
  };

  await fs.writeFile(filePath, JSON.stringify(logPayload, null, 2), 'utf8');
};
