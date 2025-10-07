const DEFAULT_SYSTEM_PROMPT =
  'Ask for disassembly, summaries, or placement suggestions. The agent mirrors updates into the project store.';

type ChatRole = 'user' | 'assistant' | 'tool' | 'system';

type ChatHistory = Parameters<NonNullable<Window['agentApi']>['chat']>[0]['messages'];
type AgentChatResponse = Awaited<ReturnType<NonNullable<Window['agentApi']>['chat']>>;
type AgentChatResult = AgentChatResponse['result'];

type ToolCallPayload = { toolName: string; toolCallId: string; input: unknown };

type ToolResultPayload = { toolName?: string; output?: unknown };

type AgentErrorPayload = { message: string };

type ChatTimelineMessage = {
  id: string;
  role: ChatRole;
  content: string;
  isStreaming?: boolean;
  meta?: string;
  error?: boolean;
};

export class ChatTab {
  private readonly statusEl = document.getElementById('chat-status') as HTMLParagraphElement | null;
  private readonly threadEl = document.getElementById('chat-thread') as HTMLElement | null;
  private readonly formEl = document.getElementById('chat-form') as HTMLFormElement | null;
  private readonly inputEl = document.getElementById('chat-message') as HTMLTextAreaElement | null;
  private readonly sendButton = document.getElementById('chat-send') as HTMLButtonElement | null;
  private readonly unsubscribes: Array<() => void> = [];
  private readonly assistantBySession = new Map<string, string>();

  private readonly messages: ChatTimelineMessage[] = [];
  private history: ChatHistory = [];
  private isStreaming = false;

  constructor(private readonly onSnapshotRefresh?: () => Promise<void> | void) {
    if (!window.agentApi) {
      this.renderOfflineState();
      return;
    }

    this.appendSystemMessage(DEFAULT_SYSTEM_PROMPT);
    this.updateStatus('Idle', 'ready');
    this.registerEventListeners();
    this.refreshSendButtonState();
  }

  dispose(): void {
    this.unsubscribes.forEach((unsubscribe) => unsubscribe());
    this.unsubscribes.length = 0;
  }

  private registerEventListeners(): void {
    if (!window.agentApi) {
      return;
    }

    this.formEl?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.submit();
    });

    this.inputEl?.addEventListener('input', () => {
      this.resizeInput();
      this.refreshSendButtonState();
    });

    this.inputEl?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.submit();
      }
    });

    const subscriptions = [
      window.agentApi.onTextDelta((payload) => this.applyTextDelta(payload.sessionId, payload.delta)),
      window.agentApi.onToolCall((payload) => this.handleToolCall(payload.sessionId, payload.call)),
      window.agentApi.onToolResult((payload) => this.handleToolResult(payload.sessionId, payload.result)),
      window.agentApi.onError((payload) => this.handleAgentError(payload.sessionId, payload.error))
    ];

    this.unsubscribes.push(...subscriptions);

    window.addEventListener('beforeunload', () => this.dispose(), { once: true });
  }

  private submit(): void {
    if (!window.agentApi || !this.inputEl) {
      return;
    }

    const rawMessage = this.inputEl.value.trim();
    if (!rawMessage || this.isStreaming) {
      return;
    }

    const sessionId = self.crypto?.randomUUID?.() ?? String(Date.now());

    this.appendMessage({
      id: self.crypto?.randomUUID?.() ?? `${Date.now()}-user`,
      role: 'user',
      content: rawMessage
    });

    this.history.push({ role: 'user', content: rawMessage });
    this.inputEl.value = '';
    this.resizeInput();

    const assistantMessageId = this.appendMessage({
      id: self.crypto?.randomUUID?.() ?? `${Date.now()}-assistant`,
      role: 'assistant',
      content: '',
      isStreaming: true
    });
    this.assistantBySession.set(sessionId, assistantMessageId);

    this.isStreaming = true;
    this.updateStatus('Working…', 'working');
    this.refreshSendButtonState();

    window.agentApi
      .chat({
        sessionId,
        messages: this.history
      })
      .then(({ result }) => {
        this.finalizeAssistantMessage(sessionId, result.text ?? '');
        this.history.push({ role: 'assistant', content: result.text ?? '' });
        this.updateStatus('Idle', 'ready');
        this.refreshSnapshots(result);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Agent request failed';
        this.markAssistantError(sessionId, message);
        this.updateStatus('Error', 'error');
      })
      .finally(() => {
        this.isStreaming = false;
        this.refreshSendButtonState();
      });
  }

  private applyTextDelta(sessionId: string, delta: string): void {
    const messageId = this.assistantBySession.get(sessionId);
    if (!messageId) {
      return;
    }

    const message = this.messages.find((item) => item.id === messageId);
    if (!message) {
      return;
    }

    message.content += delta;
    this.renderMessages();
  }

  private handleToolCall(sessionId: string, call: ToolCallPayload): void {
    this.appendMessage({
      id: `${sessionId}-tool-${call.toolCallId}`,
      role: 'tool',
      content: `Tool ${call.toolName} invoked`,
      meta: this.formatStructured(call.input)
    });
  }

  private handleToolResult(sessionId: string, result: ToolResultPayload): void {
    this.appendMessage({
      id: `${sessionId}-tool-result-${Date.now()}`,
      role: 'tool',
      content: `Tool ${result.toolName ?? 'result'} returned`,
      meta: this.formatStructured(result.output)
    });
  }

  private handleAgentError(sessionId: string, error: AgentErrorPayload): void {
    this.markAssistantError(sessionId, error.message);
    this.isStreaming = false;
    this.refreshSendButtonState();
  }

  private markAssistantError(sessionId: string, details: string): void {
    const messageId = this.assistantBySession.get(sessionId);
    if (!messageId) {
      return;
    }

    const message = this.messages.find((item) => item.id === messageId);
    if (!message) {
      return;
    }

    message.isStreaming = false;
    message.error = true;
    message.content = message.content ? `${message.content}\n⚠️ ${details}` : `⚠️ ${details}`;

    this.assistantBySession.delete(sessionId);
    this.renderMessages();
  }

  private finalizeAssistantMessage(sessionId: string, content: string): void {
    const messageId = this.assistantBySession.get(sessionId);
    if (!messageId) {
      this.appendMessage({
        id: self.crypto?.randomUUID?.() ?? `${Date.now()}-assistant-final`,
        role: 'assistant',
        content,
        isStreaming: false
      });
      return;
    }

    const message = this.messages.find((item) => item.id === messageId);
    if (!message) {
      return;
    }

    message.content = content;
    message.isStreaming = false;
    this.assistantBySession.delete(sessionId);
    this.renderMessages();
  }

  private appendSystemMessage(content: string): void {
    this.appendMessage({
      id: self.crypto?.randomUUID?.() ?? `${Date.now()}-system`,
      role: 'system',
      content
    });
  }

  private appendMessage(message: ChatTimelineMessage): string {
    this.messages.push(message);
    this.renderMessages();
    return message.id;
  }

  private renderMessages(): void {
    if (!this.threadEl) {
      return;
    }

    this.threadEl.innerHTML = '';

    const fragment = document.createDocumentFragment();
    this.messages.forEach((message) => {
      const item = document.createElement('article');
      item.className = `chat-message chat-message--${message.role}`;

      if (message.isStreaming) {
        item.classList.add('is-streaming');
      }

      if (message.error) {
        item.classList.add('has-error');
      }

      const body = document.createElement('p');
      body.className = 'chat-message__content';
      body.textContent = message.content;

      const meta = document.createElement('span');
      meta.className = 'chat-message__meta';
      meta.textContent = this.metaLabelForRole(message.role);

      item.append(meta, body);

      if (message.meta) {
        const details = document.createElement('pre');
        details.className = 'chat-message__details';
        details.textContent = message.meta;
        item.appendChild(details);
      }

      fragment.appendChild(item);
    });

    this.threadEl.appendChild(fragment);
    this.threadEl.scrollTop = this.threadEl.scrollHeight;
  }

  private metaLabelForRole(role: ChatRole): string {
    switch (role) {
      case 'user':
        return 'You';
      case 'assistant':
        return 'Axel Agent';
      case 'tool':
        return 'Tool';
      default:
        return 'System';
    }
  }

  private resizeInput(): void {
    if (!this.inputEl) {
      return;
    }

    this.inputEl.style.height = 'auto';
    this.inputEl.style.height = `${Math.min(this.inputEl.scrollHeight, 160)}px`;
  }

  private refreshSendButtonState(): void {
    if (!this.sendButton) {
      return;
    }

    const hasText = (this.inputEl?.value.trim().length ?? 0) > 0;
    this.sendButton.disabled = this.isStreaming || !hasText;
  }

  private updateStatus(text: string, mode: 'ready' | 'working' | 'error'): void {
    if (!this.statusEl) {
      return;
    }

    const label = this.statusEl.querySelector('span:nth-of-type(2)');
    if (label) {
      label.textContent = text;
    }

    this.statusEl.classList.remove('is-ready', 'is-working', 'is-error');
    this.statusEl.classList.add(`is-${mode}`);
  }

  private renderOfflineState(): void {
    if (this.statusEl) {
      this.updateStatus('Agent unavailable. Configure OPENAI_API_KEY to enable chat.', 'error');
    }

    if (this.sendButton) {
      this.sendButton.disabled = true;
    }

    if (this.threadEl) {
      const message = document.createElement('p');
      message.className = 'chat-message chat-message--system';
      message.textContent =
        'The agent bridge is disabled. Update environment variables and reload to chat with MCP tools.';
      this.threadEl.appendChild(message);
    }
  }

  private formatStructured(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  }

  private refreshSnapshots(result: AgentChatResult): void {
    if (!this.onSnapshotRefresh) {
      return;
    }

    if (result.toolCalls.length === 0 && result.text.trim().length === 0) {
      return;
    }

    void this.onSnapshotRefresh();
  }
}
