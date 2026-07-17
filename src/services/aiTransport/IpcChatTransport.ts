/**
 * IPC chat transport — Cherry Studio pattern adapter for DesktopFairy.
 */
import type { AgentConfig } from "../../shared/agent";
import type { ToolTerminalState } from "../../shared/ai/stream";

const api = window.electronAPI;

export interface LegacyStreamEvent {
  channel: string;
  data: Record<string, unknown>;
}

export interface StreamAttachResult {
  attached: boolean;
  chunks: Array<Record<string, unknown>>;
  legacyEvents?: LegacyStreamEvent[];
  status?: string;
  requestId?: string;
}

export interface AgentStreamOpenResult {
  mode: string;
  requestId: string;
}

export async function openAgentStream(payload: {
  topicId: string;
  requestId: string;
  messages: Array<Record<string, unknown>>;
  agentConfig: AgentConfig;
  apiConfig: {
    apiHost: string;
    apiKey?: string;
    providerType?: string;
    modelName: string;
  };
  terminalSessionId?: string;
}) {
  return api.invoke("ai:stream_open", payload) as Promise<AgentStreamOpenResult>;
}

export async function attachTopicStream(topicId: string): Promise<StreamAttachResult> {
  return api.invoke("ai:stream_attach", { topicId }) as Promise<StreamAttachResult>;
}

export function detachTopicStream(topicId: string): void {
  void api.invoke("ai:stream_detach", { topicId });
}

export function abortTopicStream(topicId: string, requestId?: string): void {
  void api.invoke("ai:stream_abort", { topicId, requestId });
}

export interface LegacyStreamHandlers {
  onChatChunk?: (data: {
    requestId: string;
    delta?: string;
    reasoning?: string;
  }) => void;
  onChatDone?: (data: {
    requestId: string;
    aborted?: boolean;
    tools?: ToolTerminalState[];
  }) => void;
  onChatError?: (data: { requestId: string; message: string }) => void;
  onAgentTool?: (data: Record<string, unknown>) => void;
}

export function replayLegacyStreamEvents(
  events: LegacyStreamEvent[] | undefined,
  handlers: LegacyStreamHandlers,
) {
  for (const event of events || []) {
    const { channel, data } = event;
    switch (channel) {
      case "chat:stream:chunk":
        handlers.onChatChunk?.(data as { requestId: string; delta?: string; reasoning?: string });
        break;
      case "chat:stream:done":
        handlers.onChatDone?.(
          data as { requestId: string; aborted?: boolean; tools?: ToolTerminalState[] },
        );
        break;
      case "chat:stream:error":
        handlers.onChatError?.(data as { requestId: string; message: string });
        break;
      case "agent:stream:tool":
        handlers.onAgentTool?.(data);
        break;
      default:
        break;
    }
  }
}

export function subscribeAiStream(
  topicId: string,
  handlers: {
    onChunk?: (payload: { topicId: string; requestId: string; chunk: Record<string, unknown> }) => void;
    onDone?: (payload: { topicId: string; requestId: string; status: string }) => void;
    onError?: (payload: { topicId: string; requestId: string; message: string }) => void;
  },
) {
  const offChunk = api.onAiStreamChunk?.((payload) => {
    if (payload.topicId !== topicId) return;
    handlers.onChunk?.(payload);
  });
  const offDone = api.onAiStreamDone?.((payload) => {
    if (payload.topicId !== topicId) return;
    handlers.onDone?.(payload);
  });
  const offError = api.onAiStreamError?.((payload) => {
    if (payload.topicId !== topicId) return;
    handlers.onError?.(payload);
  });
  return () => {
    offChunk?.();
    offDone?.();
    offError?.();
  };
}

export type { ToolTerminalState };
