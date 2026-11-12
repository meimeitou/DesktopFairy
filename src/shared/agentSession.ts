import type { SelectedHost } from "./hostSelection";
/**
 * 智能体会话状态机 — 单一 owner of 智能体流生命周期。
 *
 * ChatPage / TerminalAgentDrawer / HostChatPanel 三个聊天面共用同一套
 * chunk → done / error / tool → compact 的状态转移；此前三处手写编排已经
 * drift（reasoning 索引 first vs last、maxTurnsReached 静默丢弃）。
 * 本 module 收敛全部转移逻辑：输入 IPC 流事件，输出下一份会话状态。
 *
 * 纯函数、无 React / IPC 依赖 — 测试直接调用即可。
 */
import type { ChatMsg } from "./chatMessages";
import {
  applyStreamTextPart,
  classifyStreamError,
  filterForAgentHistory,
  findFirstAssistantReplyIndex,
  findLastAssistantReplyIndex,
  pruneEmptyAssistantMessages,
  reconcileToolMessages,
  upsertAgentToolMessage,
} from "./chatMessages";
import type { ToolTerminalState } from "./ai/stream";
import type { KnowledgeCitation } from "./knowledge";
import { extractWebCitations } from "./webCitation";

export type { ToolTerminalState };

/** 单个会话（topic / terminal tab / host panel）的页面态。 */
export interface AgentSessionState {
  messages: ChatMsg[];
  input: string;
  selectedSkillIds?: string[];
  selectedHosts?: SelectedHost[];
  hostErrors?: Record<string, string>;
  skillErrors?: Record<string, string>;
  streaming: boolean;
  requestId: string | null;
  sessionReady: boolean;
  lastPromptTokens?: number;
  lastCompletionTokens?: number;
  lastUsageMessageCount?: number;
}

export function emptyAgentSessionState(): AgentSessionState {
  return {
    messages: [],
    input: "",
    streaming: false,
    requestId: null,
    sessionReady: false,
  };
}

export interface StreamUsage {
  promptTokens?: number;
  completionTokens?: number;
}

export interface ChatChunkEvent {
  requestId: string;
  partId?: string;
  delta?: string;
  reasoning?: string;
}

export interface ChatDoneEvent {
  requestId: string;
  aborted?: boolean;
  maxTurnsReached?: boolean;
  tools?: ToolTerminalState[];
  usage?: StreamUsage;
}

export interface ChatErrorEvent {
  requestId: string;
  message: string;
}

export interface AgentToolEvent {
  requestId: string;
  toolCallId?: string;
  toolName?: string;
  toolArgs?: string;
  approvalId?: string;
  status?: ChatMsg["toolStatus"];
  message?: string;
  resultPreview?: string;
  force?: boolean;
}

export interface CitationsEvent {
  requestId: string;
  citations?: KnowledgeCitation[];
}

export interface KnowledgeErrorEvent {
  requestId: string;
  errors?: Array<{ kind: string; message: string }>;
}

export type SessionPatchKind =
  | "chunk"
  | "done"
  | "error"
  | "tool"
  | "citations"
  | "knowledge-error"
  | "send-open"
  | "send-fail";

export interface SessionPatchMeta {
  /** Reasoning 停靠的气泡：流式期间多条 assistant 气泡时用第一个（与 tool 轮次对齐）。 */
  maxTurnsReached?: boolean;
  /** /compact 完成态：clear 标记 + 摘要。 */
  compact?: boolean;
  /** done/error 后是否触发落盘（由宿主决定怎么落盘）。 */
  persist?: boolean;
}

let idCounter = 0;
export function genSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  idCounter += 1;
  return `req-${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 记录一次发送：追加 user 消息 + 空 assistant 占位，进入 streaming。 */
export function beginSend(
  state: AgentSessionState,
  opts: {
    requestId: string;
    userText: string;
    isCompact?: boolean;
    keepInput?: boolean;
    attachments?: ChatMsg["attachments"];
    usageCleared?: boolean;
    selectedSkillIds?: string[];
    selectedHosts?: SelectedHost[];
    rawText?: string;
  },
): AgentSessionState {
  const now = Date.now();
  const messages = [
    ...state.messages,
    ...(opts.isCompact || (opts.userText === "" && !opts.attachments?.length)
      ? []
      : [
          {
            id: genSessionId(),
            role: "user" as const,
            content: opts.userText,
            ...(opts.selectedSkillIds?.length || opts.selectedHosts?.length
              ? { selectedSkillIds: opts.selectedSkillIds, selectedHosts: opts.selectedHosts, rawText: opts.rawText } : {}),
            ...(opts.attachments && opts.attachments.length > 0
              ? { attachments: opts.attachments }
              : {}),
            timestamp: now,
          } satisfies ChatMsg,
        ]),
    {
      id: genSessionId(),
      role: "assistant" as const,
      content: "",
      timestamp: now,
    } satisfies ChatMsg,
  ];
  return {
    ...state,
    messages,
    input: opts.keepInput ? state.input : "",
    selectedSkillIds: opts.keepInput ? state.selectedSkillIds : [],
    selectedHosts: opts.keepInput ? state.selectedHosts : [],
    hostErrors: undefined,
    skillErrors: undefined,
    streaming: true,
    requestId: opts.requestId,
  };
}

/** Clear the submitted draft only after main accepted the request. Resends keep the current draft. */
export function acceptSendDraft<T extends AgentSessionState>(
  state: T,
  keepDraft: boolean,
  submitted?: Pick<AgentSessionState, "input" | "selectedSkillIds" | "selectedHosts">,
): T {
  const changed = submitted && (state.input !== submitted.input ||
    JSON.stringify(state.selectedSkillIds || []) !== JSON.stringify(submitted.selectedSkillIds || []) ||
    JSON.stringify(state.selectedHosts || []) !== JSON.stringify(submitted.selectedHosts || []));
  return keepDraft || changed ? state : { ...state, input: "", selectedSkillIds: [], selectedHosts: [], hostErrors: undefined, skillErrors: undefined };
}

/** 续跑（maxTurns 到顶）：不插用户消息，只追加空 assistant 气泡。 */
export function beginContinue(
  state: AgentSessionState,
  requestId: string,
): AgentSessionState {
  return {
    ...state,
    messages: [
      ...state.messages,
      {
        id: genSessionId(),
        role: "assistant" as const,
        content: "",
        timestamp: Date.now(),
      } satisfies ChatMsg,
    ],
    streaming: true,
    requestId,
  };
}

/** 流式文本增量（已由 chunkBuffer 合帧后的 parts）。 */
export function applyChunks(
  state: AgentSessionState,
  parts: Array<{ partId?: string; text: string }>,
  reasoning: string,
): AgentSessionState {
  if (parts.length === 0 && !reasoning) return state;
  let messages = state.messages;
  for (const part of parts) {
    messages = applyStreamTextPart(messages, part.partId, part.text);
  }
  if (reasoning) {
    // 与流式期间 tool 轮次对齐：reasoning 归到第一条 assistant 回复。
    const ri = Math.max(0, findFirstAssistantReplyIndex(messages));
    const next = messages.slice();
    next[ri] = {
      ...next[ri],
      reasoning: (next[ri].reasoning ?? "") + reasoning,
    };
    messages = next;
  }
  return { ...state, messages };
}

/** 流完成：对账工具行、记录 usage、处理 /compact 摘要固化。 */
export function applyDone(
  state: AgentSessionState,
  event: ChatDoneEvent,
  opts: { isCompact?: boolean } = {},
): { state: AgentSessionState; meta: SessionPatchMeta } {
  const messages = pruneEmptyAssistantMessages(
    reconcileToolMessages(state.messages, event.tools, Boolean(event.aborted)),
  );
  // Web-search citations: hang the turn's source links under the final reply.
  const webCitations = event.aborted ? [] : extractWebCitations(event.tools);
  if (webCitations.length > 0) {
    const idx = findLastAssistantReplyIndex(messages);
    if (idx >= 0) messages[idx] = { ...messages[idx], webCitations };
  }
  const base: AgentSessionState = {
    ...state,
    messages,
    streaming: false,
    requestId: null,
    ...(event.usage?.promptTokens != null && event.usage.promptTokens > 0
      ? {
          lastPromptTokens: event.usage.promptTokens,
          lastCompletionTokens: event.usage.completionTokens,
          lastUsageMessageCount: filterForAgentHistory(messages).length,
        }
      : {}),
  };

  if (event.aborted) {
    return {
      state: base,
      meta: { persist: true, compact: opts.isCompact },
    };
  }

  if (opts.isCompact) {
    const assistantIdx = findLastAssistantReplyIndex(messages);
    const summary =
      assistantIdx >= 0 && !messages[assistantIdx].error
        ? messages[assistantIdx].content
        : "";
    if (summary.trim()) {
      const now = Date.now();
      return {
        state: {
          ...base,
          lastPromptTokens: undefined,
          lastCompletionTokens: undefined,
          lastUsageMessageCount: undefined,
          messages: [
            ...messages,
            {
              id: genSessionId(),
              role: "user" as const,
              type: "clear" as const,
              content: "",
              timestamp: now,
            } satisfies ChatMsg,
            {
              id: genSessionId(),
              role: "user" as const,
              content: `[上下文摘要]\n\n${summary.trim()}`,
              timestamp: now,
            } satisfies ChatMsg,
          ],
        },
        meta: { persist: true, compact: true },
      };
    }
  }

  return {
    state: base,
    meta: { persist: true, maxTurnsReached: Boolean(event.maxTurnsReached) },
  };
}

/** 流失败：末条 assistant 回复标记错误；无回复则只结束 streaming。 */
export function applyError(
  state: AgentSessionState,
  event: ChatErrorEvent,
): { state: AgentSessionState; meta: SessionPatchMeta } {
  const reconciled = reconcileToolMessages(state.messages, undefined, false);
  const idx = findLastAssistantReplyIndex(reconciled);
  let messages = reconciled;
  if (idx >= 0) {
    const next = reconciled.slice();
    const target = next[idx];
    const errorMessage = target.content || `请求失败：${event.message}`;
    const errorKind = classifyStreamError(event.message) ?? undefined;
    next[idx] = {
      ...target,
      content: errorMessage,
      error: true,
      ...(errorKind ? { errorKind } : {}),
    };
    messages = next;
  }
  return {
    state: { ...state, messages, streaming: false, requestId: null },
    meta: { persist: true },
  };
}

/** 工具调用进度：插入/更新工具行。 */
export function applyToolEvent(
  state: AgentSessionState,
  event: AgentToolEvent,
): AgentSessionState {
  return {
    ...state,
    messages: upsertAgentToolMessage(state.messages, {
      toolCallId: event.toolCallId,
      toolName: event.toolName,
      toolArgs: event.toolArgs,
      toolApprovalId: event.approvalId,
      toolStatus: event.status,
      toolMessage: event.message,
      toolResultPreview: event.resultPreview,
      toolForce: event.force,
    }),
  };
}

/** 知识库引用：挂到最后一条 assistant 回复。 */
export function applyCitations(
  state: AgentSessionState,
  event: CitationsEvent,
): AgentSessionState {
  if (!event.citations?.length) return state;
  const idx = findLastAssistantReplyIndex(state.messages);
  if (idx < 0) return state;
  const next = state.messages.slice();
  next[idx] = { ...next[idx], knowledgeCitations: event.citations };
  return { ...state, messages: next };
}

/** 知识库预注入错误：非阻塞警示，挂到最后一条 assistant 回复。 */
export function applyKnowledgeError(
  state: AgentSessionState,
  event: KnowledgeErrorEvent,
): AgentSessionState {
  if (!event.errors?.length) return state;
  const summary = event.errors
    .map((e) => {
      const label =
        e.kind === "vector"
          ? "向量库检索"
          : e.kind === "semi_structured"
            ? "半结构化筛选"
            : "知识库预注入";
      return `${label}失败：${e.message}`;
    })
    .join("；");
  const idx = findLastAssistantReplyIndex(state.messages);
  if (idx < 0) return state;
  const next = state.messages.slice();
  const prev = next[idx];
  const existing = String(prev.knowledgeWarning || "");
  next[idx] = {
    ...prev,
    knowledgeWarning: existing ? `${existing}；${summary}` : summary,
  };
  return { ...state, messages: next };
}

/** openAgentStream 被拒（blocked / 异常）：末条 assistant 标记错误。 */
export function applySendFail(
  state: AgentSessionState,
  requestId: string,
  message: string,
  errorKind?: "model_config",
): AgentSessionState {
  const owns = state.requestId === requestId;
  const idx = findLastAssistantReplyIndex(state.messages);
  const nextMsgs = state.messages.slice();
  if (idx >= 0) {
    nextMsgs[idx] = { ...nextMsgs[idx], content: message, error: true, ...(errorKind ? { errorKind } : {}) };
  }
  return {
    ...state,
    messages: nextMsgs,
    streaming: owns ? false : state.streaming,
    requestId: owns ? null : state.requestId,
  };
}

/** 末尾插入 / 撤销 clear 标记（清除上下文按钮、/clear 命令共用）。 */
export function toggleClearMarker(state: AgentSessionState): AgentSessionState {
  const last = state.messages[state.messages.length - 1];
  const messages =
    last?.type === "clear"
      ? state.messages.slice(0, -1)
      : [
          ...state.messages,
          {
            id: genSessionId(),
            role: "user" as const,
            type: "clear" as const,
            content: "",
            timestamp: Date.now(),
          } satisfies ChatMsg,
        ];
  return {
    ...state,
    messages,
    lastPromptTokens: undefined,
    lastCompletionTokens: undefined,
    lastUsageMessageCount: undefined,
  };
}

/** 后端未配置等本地引导：user + error 气泡，不进入 streaming。 */
export function appendGuidance(
  state: AgentSessionState,
  text: string,
  opts: { keepInput?: boolean } = {},
): AgentSessionState {
  const now = Date.now();
  return {
    ...state,
    input: opts.keepInput ? state.input : "",
    messages: [
      ...state.messages,
      {
        id: genSessionId(),
        role: "user" as const,
        content: text,
        timestamp: now,
      } satisfies ChatMsg,
      {
        id: genSessionId(),
        role: "assistant" as const,
        content: "",
        error: true,
        timestamp: now,
      } satisfies ChatMsg,
    ],
    streaming: false,
    requestId: null,
  };
}

/** 清空全部消息（确认后）。 */
export function clearMessages(state: AgentSessionState): AgentSessionState {
  return {
    ...emptyAgentSessionState(),
    sessionReady: state.sessionReady,
  };
}

/** Called only at a model-step boundary, after flushing preceding chunks. */
export function applyInputMessages(state: AgentSessionState, items: ChatMsg[]): AgentSessionState {
  const known = new Set(state.messages.map((m) => m.id));
  const added = items.filter((m) => !known.has(m.id));
  if (!added.length) return state;
  const ids = new Set(items.map((m) => m.id));
  return { ...state, messages: [...pruneEmptyAssistantMessages(state.messages.filter((m) => !ids.has(m.id))), ...items,
    { id: genSessionId(), role: 'assistant', content: '', timestamp: Date.now() }] };
}
