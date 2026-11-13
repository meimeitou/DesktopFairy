import type { SelectedHost } from "../../shared/hostSelection";
/**
 * IPC chat transport — Cherry Studio pattern adapter for DesktopFairy.
 */
import type { AgentConfig } from "../../shared/agent";
import type { ToolTerminalState } from "../../shared/ai/stream";
import type { ProviderType } from "../../shared/providers";

const api = window.electronAPI;

export interface LegacyStreamEvent {
  channel: string;
  data: Record<string, unknown>;
}

export interface StreamAttachResult {
  inputs?: import("../../shared/agentInputs").AgentInputItem[];
  attached: boolean;
  chunks: Array<Record<string, unknown>>;
  legacyEvents?: LegacyStreamEvent[];
  status?: string;
  requestId?: string;
}

export interface AgentStreamOpenResult {
  mode: string;
  requestId: string;
  skillErrors?: Record<string, string>;
  hostErrors?: Record<string, string>;
}

export interface AgentStreamOpenPayload {
  compact?: boolean;
  userMessage?: import("../../shared/chatMessages").ChatMsg;
  selectedHosts?: SelectedHost[];
  selectedSkillIds?: string[];
  topicId: string;
  requestId: string;
  messages: Array<Record<string, unknown>>;
  agentConfig: AgentConfig;
  apiConfig: {
    apiHost: string;
    apiKey?: string;
    providerType?: ProviderType;
    modelName: string;
  };
  terminalSessionId?: string;
  knowledgeBaseIds?: string[];
}

export async function openAgentStream(payload: AgentStreamOpenPayload) {
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
  onAgentInput?: (data: import("../../shared/agentInputs").AgentInputEvent) => void;
  onChatChunk?: (data: {
    checkpoint?: import('../../shared/contextCheckpoint').ContextCheckpoint;
    requestId: string;
    partId?: string;
    delta?: string;
    reasoning?: string;
  }) => void;
  onChatDone?: (data: {
    isCompact?: boolean;
    requestId: string;
    aborted?: boolean;
    tools?: ToolTerminalState[];
    usage?: { promptTokens?: number; completionTokens?: number };
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
      case "agent:stream:input":
        handlers.onAgentInput?.(data as unknown as import("../../shared/agentInputs").AgentInputEvent);
        break;
      case "chat:stream:chunk":
        handlers.onChatChunk?.(data as { requestId: string; partId?: string; delta?: string; reasoning?: string });
        break;
      case "chat:stream:done":
        handlers.onChatDone?.(
          data as {
            requestId: string;
            aborted?: boolean;
            tools?: ToolTerminalState[];
            usage?: { promptTokens?: number; completionTokens?: number };
          },
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

export function agentStreamRejection(result: AgentStreamOpenResult) {
  if (result.mode === "invalid_hosts") return Object.values(result.hostErrors || {}).join(" ") || "机器校验失败，请重新选择。";
  if (result.mode === "invalid_skills") return Object.values(result.skillErrors || {}).join(" ") || "技能加载失败，请重新选择。";
  if (result.mode === "blocked") return "该会话已有进行中的请求，请等待完成或先停止。";
  return null;
}
