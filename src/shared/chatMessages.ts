import type { SelectedHost } from "./hostSelection";
import type { ChatAttachment } from "./chatAttachments";
import { isSupportedAttachmentName } from "./chatAttachments";
import type { ToolTerminalState } from "./ai/stream";
import { estimateMessageTokens } from "./contextUsage";
import { formatToolEvidenceForApi } from "./toolEvidence";
import type { KnowledgeCitation } from "./knowledge";
import type { WebCitation } from "./webCitation";

export type ChatRole = "user" | "assistant";

export interface ChatMsg {
  contextCheckpoint?: import('./contextCheckpoint').ContextCheckpoint;
  id: string;
  role: ChatRole;
  content: string;
  selectedSkillIds?: string[];
  selectedHosts?: SelectedHost[];
  rawText?: string;
  /** Model reasoning / chain-of-thought text (from `reasoning_content`). Display-only, never replayed to the model. */
  reasoning?: string;
  /** Runtime-only: UIMessageChunk text part id that fills this bubble. Routing key while streaming. */
  partId?: string;
  type?: "clear" | "tool";
  error?: boolean;
  /** Set when error is true: categorizes why the reply failed.
   *  "model_config" = auth failure, connection refused, model not configured, etc.
   *  Triggers an actionable "修改模型设置" button in the bubble. */
  errorKind?: "model_config";
  attachments?: ChatAttachment[];
  /** Prepared content of an injected input, including text files and image parts. */
  agentInputContent?: ApiMessage["content"];
  timestamp?: number;
  toolName?: string;
  toolCallId?: string;
  toolArgs?: string;
  toolApprovalId?: string;
  toolStatus?:
    | "streaming"
    | "awaiting_approval"
    | "awaiting_input"
    | "running"
    | "done"
    | "error"
    | "denied";
  toolMessage?: string;
  toolResultPreview?: string;
  /** Relative path under chat_tool_results/{topicId}/ */
  toolResultRef?: string;
  toolResultBytes?: number;
  /** Force approval card: never bulk-approved by "always allow". */
  toolForce?: boolean;
  /** Display-only knowledge citations for plain-chat RAG. Not replayed to the model. */
  knowledgeCitations?: KnowledgeCitation[];
  /** Display-only web-search citations collected from this turn's WebSearch/WebFetch calls. Not replayed to the model. */
  webCitations?: WebCitation[];
  /** Display-only warning shown when knowledge pre-injection failed. Not replayed. */
  knowledgeWarning?: string;
}

export type ApiContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ApiToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ApiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ApiContentPart[];
  tool_calls?: ApiToolCall[];
  tool_call_id?: string;
  name?: string;
};

export function filterAfterContextClear(messages: ChatMsg[]): ChatMsg[] {
  const clearIndex = messages.findLastIndex((m) => m.type === "clear");
  if (clearIndex === -1) return messages;
  const marker = messages[clearIndex];
  const after = messages.slice(clearIndex + 1);
  return marker.contextCheckpoint
    ? [{ ...marker, type: undefined, content: `[上下文摘要]\n${marker.contextCheckpoint.summary}` }, ...after]
    : after;
}


/** Agent history: keep tool messages and non-empty assistant/user turns. */
export function filterForAgentHistory(messages: ChatMsg[]): ChatMsg[] {
  return filterAfterContextClear(messages).filter(
    (m) =>
      m.type !== "clear" &&
      !m.error &&
      (m.type === "tool" ||
        !(m.role === "assistant" && !m.content?.trim())),
  );
}

/** Last normal assistant bubble (excludes tool/clear/error messages). */
export function findLastAssistantReplyIndex(messages: ChatMsg[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.type === 'clear') break;
    if (
      m.role === "assistant" &&
      m.type !== "tool" &&
      !m.error
    ) {
      return i;
    }
  }
  return -1;
}

/** First assistant reply after the last user message — reasoning for all turns accumulates here. */
export function findFirstAssistantReplyIndex(messages: ChatMsg[]): number {
  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.type === 'clear') { lastUserIdx = i; break; }
    if (m.role === "user" && m.type !== "tool") {
      lastUserIdx = i;
      break;
    }
  }
  for (let i = lastUserIdx + 1; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === "assistant" && m.type !== "tool" && m.type !== "clear" && !m.error) {
      return i;
    }
  }
  return -1;
}

function newChatMsgId(): string {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** True when the bubble is a reusable streaming placeholder (no text yet). */
export function isEmptyAssistantPlaceholder(m: ChatMsg): boolean {
  return (
    m.role === "assistant" &&
    m.type !== "tool" &&
    m.type !== "clear" &&
    !m.error &&
    !m.content?.trim() &&
    !m.reasoning?.trim()
  );
}

/** Drop leftover empty assistant shells (e.g. after tools with no follow-up text). */
export function pruneEmptyAssistantMessages(messages: ChatMsg[]): ChatMsg[] {
  return messages.filter((m) => !isEmptyAssistantPlaceholder(m));
}

/**
 * Apply one text delta routed by part identity.
 * - Trailing plain assistant with same partId (both undefined counts) → append in place.
 * - Trailing plain assistant that is an empty placeholder → adopt it, stamping partId.
 * - Otherwise (different partId, tool/clear/error/user trailing, or empty list) → new bubble.
 */
export function applyStreamTextPart(
  messages: ChatMsg[],
  partId: string | undefined,
  delta: string,
): ChatMsg[] {
  if (!delta) return messages;
  const last = messages[messages.length - 1];
  const lastIsPlain =
    !!last &&
    last.role === "assistant" &&
    last.type !== "tool" &&
    last.type !== "clear" &&
    !last.error;
  if (
    lastIsPlain &&
    (last.partId === partId || isEmptyAssistantPlaceholder(last) || (!last.partId && !last.content?.trim()))
  ) {
    const next = messages.slice();
    next[next.length - 1] = {
      ...last,
      content: last.content + delta,
      partId: last.partId ?? partId,
    };
    return next;
  }
  return [
    ...messages,
    {
      id: newChatMsgId(),
      role: "assistant",
      content: delta,
      partId,
      timestamp: Date.now(),
    },
  ];
}

export type AgentToolUpsertFields = {
  toolCallId?: string;
  toolName?: string;
  toolArgs?: string;
  toolApprovalId?: string;
  toolStatus?: ChatMsg["toolStatus"];
  toolMessage?: string;
  toolResultPreview?: string;
  toolForce?: boolean;
};

/**
 * Insert or update a tool row in the chat message list.
 * Reuses a trailing empty assistant placeholder so tool cards do not orphan empty bubbles.
 */
export function upsertAgentToolMessage(
  messages: ChatMsg[],
  fields: AgentToolUpsertFields,
): ChatMsg[] {
  const { toolCallId, toolName } = fields;
  const existingIdx = toolCallId
    ? messages.findIndex(
        (m) => m.type === "tool" && m.toolCallId === toolCallId,
      )
    : messages.findIndex(
        (m) =>
          m.type === "tool" &&
          m.toolName === toolName &&
          (m.toolStatus === "running" ||
            m.toolStatus === "streaming" ||
            m.toolStatus === "awaiting_input"),
      );
  const prevTool = existingIdx >= 0 ? messages[existingIdx] : null;
  const statusApplied = shouldApplyToolStatus(prevTool?.toolStatus, fields.toolStatus);
  const nextStatus = statusApplied ? fields.toolStatus : prevTool?.toolStatus;
  // If the incoming event's status is lower priority (rejected), it must not
  // overwrite toolName/toolArgs/toolApprovalId set by a higher-priority event
  // (e.g. a streaming chunk from the bridge must not clobber toolName:'AskUserQuestion'
  // already written by askUserInStream's awaiting_input event).
  const prevWins = !statusApplied && prevTool != null;
  const toolMsg: ChatMsg = {
    id: prevTool?.id || newChatMsgId(),
    role: "assistant",
    type: "tool",
    content: "",
    toolCallId: toolCallId || prevTool?.toolCallId,
    toolName: prevWins ? (prevTool.toolName ?? toolName) : (toolName ?? prevTool?.toolName),
    toolArgs: prevWins ? (prevTool.toolArgs ?? fields.toolArgs) : (fields.toolArgs ?? prevTool?.toolArgs),
    toolApprovalId: prevWins ? (prevTool.toolApprovalId ?? fields.toolApprovalId) : (fields.toolApprovalId ?? prevTool?.toolApprovalId),
    toolStatus: nextStatus,
    toolMessage: fields.toolMessage ?? prevTool?.toolMessage,
    toolResultPreview: fields.toolResultPreview ?? prevTool?.toolResultPreview,
    toolForce: fields.toolForce ?? prevTool?.toolForce,
    timestamp: prevTool?.timestamp || Date.now(),
  };

  if (existingIdx >= 0) {
    const next = messages.slice();
    next[existingIdx] = toolMsg;
    return next;
  }

  const assistantIdx = findLastAssistantReplyIndex(messages);
  if (assistantIdx < 0) {
    return [...messages, toolMsg];
  }

  const assistant = messages[assistantIdx];
  const next = messages.slice();
  if (isEmptyAssistantPlaceholder(assistant)) {
    next.splice(assistantIdx, 0, toolMsg);
    return next;
  }

  next.splice(assistantIdx + 1, 0, toolMsg);
  const last = next[next.length - 1];
  if (!last || !isEmptyAssistantPlaceholder(last)) {
    next.push({
      id: newChatMsgId(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    });
  }
  return next;
}

/** Keep newest messages within a token budget for API requests. */
export function trimMessagesForApi(
  messages: ChatMsg[],
  options: {
    maxTokens: number;
    reserveTokens?: number;
  },
): ChatMsg[] {
  const reserve = Math.max(0, options.reserveTokens ?? 0);
  const budget = Math.max(0, options.maxTokens - reserve);
  if (messages.length === 0) return messages;

  const kept: ChatMsg[] = [];
  let totalTokens = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const len = estimateMessageTokens(msg);
    if (kept.length > 0 && totalTokens + len > budget) break;
    kept.unshift(msg);
    totalTokens += len;
  }

  if (kept.length === 0) {
    kept.push(messages[messages.length - 1]);
  }

  return kept;
}

function appendTextFileBlocks(
  text: string,
  files: { name: string; text: string }[]
): string {
  if (files.length === 0) return text;
  const blocks = files.map(
    (f) => `\n\n---\n**${f.name}**\n\`\`\`\n${f.text}\n\`\`\``
  );
  return text + blocks.join("");
}

function parseToolArgsObject(raw?: string): Record<string, unknown> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : { _raw: raw };
  } catch {
    return { _raw: raw };
  }
}

function toolResultPayload(msg: ChatMsg): string {
  return formatToolEvidenceForApi(msg);
}

function isTerminalToolStatus(status: ChatMsg["toolStatus"] | undefined): boolean {
  return status === "done" || status === "error" || status === "denied";
}

/**
 * Agent history as OpenAI-style assistant tool_calls + tool results
 * (converted to AI SDK ModelMessage[] in electron/ai/messages.cjs).
 */
export function buildAgentHistoryMessages(messages: ChatMsg[]): ApiMessage[] {
  const filtered = filterAfterContextClear(messages).filter(
    (m) => m.type !== "clear" && !m.error,
  );
  const result: ApiMessage[] = [];
  let i = 0;
  while (i < filtered.length) {
    const m = filtered[i];
    if (m.contextCheckpoint) {
      // Later tool groups may attach tool_calls to the last assistant message.
      // Do not mutate the durable checkpoint while assembling one request.
      result.push(...m.contextCheckpoint.messages.map((message) => ({ ...message })));
      i++;
      continue;
    }
    if (m.type === "tool") {
      const tools: ChatMsg[] = [];
      while (i < filtered.length && filtered[i].type === "tool") {
        const t = filtered[i];
        if (isTerminalToolStatus(t.toolStatus) && t.toolCallId && t.toolName) {
          tools.push(t);
        }
        i++;
      }
      if (tools.length === 0) continue;

      const toolCalls: ApiToolCall[] = tools.map((t) => ({
        id: t.toolCallId!,
        type: "function",
        function: {
          name: t.toolName!,
          arguments: JSON.stringify(parseToolArgsObject(t.toolArgs)),
        },
      }));

      const last = result[result.length - 1];
      if (last?.role === "assistant" && !last.tool_calls) {
        last.tool_calls = toolCalls;
      } else {
        result.push({ role: "assistant", content: "", tool_calls: toolCalls });
      }

      for (const t of tools) {
        result.push({
          role: "tool",
          tool_call_id: t.toolCallId,
          name: t.toolName,
          content: toolResultPayload(t),
        });
      }
      continue;
    }
    if (m.role === "assistant" && !m.content?.trim()) {
      i++;
      continue;
    }
    result.push({ role: m.role, content: m.role === "user" ? (m.agentInputContent ?? m.content) : m.content });
    i++;
  }
  return result;
}

export function buildAgentApiMessages(
  history: ChatMsg[],
  userText: string,
  attachmentPayloads: {
    textFiles: { name: string; text: string }[];
    images: { name: string; dataUrl: string }[];
  },
  systemPrompt?: string,
): ApiMessage[] {
  const result: ApiMessage[] = [];
  if (systemPrompt?.trim()) {
    result.push({ role: "system", content: systemPrompt.trim() });
  }

  result.push(...buildAgentHistoryMessages(history));

  const textWithFiles = appendTextFileBlocks(
    userText,
    attachmentPayloads.textFiles,
  );

  if (attachmentPayloads.images.length === 0) {
    result.push({ role: "user", content: textWithFiles });
    return result;
  }

  const parts: ApiContentPart[] = [];
  if (textWithFiles.trim()) {
    parts.push({ type: "text", text: textWithFiles });
  }
  for (const img of attachmentPayloads.images) {
    parts.push({
      type: "image_url",
      image_url: { url: img.dataUrl },
    });
  }
  result.push({ role: "user", content: parts.length > 0 ? parts : textWithFiles });
  return result;
}

/** Prevent chunkBridge "running" from downgrading an active approval/input prompt. */
export function shouldApplyToolStatus(
  current: ChatMsg["toolStatus"] | undefined,
  incoming: ChatMsg["toolStatus"],
): boolean {
  if (!incoming) return false;
  if (!current) return true;
  if (current === incoming) return true;
  // Terminal states — never regress.
  if (current === "done" || current === "error" || current === "denied") {
    return false;
  }
  // Post-approval "running": user 已批准，工具开始执行。
  // 必须允许 awaiting_approval → running，否则停止按钮永远不会显示。
  if (current === "awaiting_approval" && incoming === "running") {
    return true;
  }
  // Block regression: running → awaiting_approval would re-show permission
  // card for a tool already executing (e.g. during re-attach event replay).
  if (current === "running" && incoming === "awaiting_approval") {
    return false;
  }
  // Approval / input prompt must not be masked by pre-execute streaming events.
  if (
    (current === "awaiting_approval" || current === "awaiting_input") &&
    incoming === "streaming"
  ) {
    return false;
  }
  // Host confirmation asks once, then the same tool call starts running.
  if (current === "awaiting_input" && incoming === "running") {
    return true;
  }
  const rank: Record<NonNullable<ChatMsg["toolStatus"]>, number> = {
    streaming: 1,
    running: 2,
    awaiting_approval: 3,
    awaiting_input: 3,
    denied: 4,
    error: 5,
    done: 6,
  };
  return (rank[incoming] ?? 0) >= (rank[current] ?? 0);
}

export function reconcileToolMessages(
  messages: ChatMsg[],
  tools: ToolTerminalState[] | undefined,
  aborted: boolean,
): ChatMsg[] {
  const snapshot = new Map((tools || []).map((t) => [t.toolCallId, t]));
  return messages.map((m) => {
    if (m.type !== "tool") return m;
    const snap = m.toolCallId ? snapshot.get(m.toolCallId) : undefined;
    if (snap) {
      if (snap.status === "done") {
        return {
          ...m,
          toolStatus: "done" as const,
          toolResultPreview: snap.resultPreview ?? m.toolResultPreview,
        };
      }
      if (snap.status === "error") {
        return {
          ...m,
          toolStatus: "error" as const,
          toolMessage: snap.message || m.toolMessage,
        };
      }
    }
    if (
      m.toolStatus === "streaming" ||
      m.toolStatus === "running" ||
      m.toolStatus === "awaiting_approval" ||
      m.toolStatus === "awaiting_input"
    ) {
      return {
        ...m,
        toolStatus: "error" as const,
        toolMessage: aborted ? "已取消" : "会话已结束",
      };
    }
    return m;
  });
}

export function isSupportedFileName(name: string): boolean {
  return isSupportedAttachmentName(name);
}

/**
 * Classify a stream error message: returns "model_config" when the error
 * is due to authentication failure, unreachable host, model not found, or
 * quota exhaustion — anything the user must fix via model/provider settings.
 */
export function classifyStreamError(message: string): "model_config" | null {
  const m = message.toLowerCase();
  // HTTP 401 / 403 / auth keywords
  if (/\b(401|unauthorized|authentication|invalid.{0,20}(api.?key|token)|api.?key.{0,20}(invalid|expired|missing)|incorrect.{0,20}key)\b/.test(m)) return "model_config";
  // HTTP 403
  if (/\b403\b/.test(m)) return "model_config";
  // HTTP 404 model-not-found
  if (/\b404\b/.test(m) && /model|endpoint|path/.test(m)) return "model_config";
  // quota / rate-limit billing
  if (/\b(429|quota.{0,20}exceeded|insufficient.{0,20}(quota|credit|balance)|rate.{0,20}limit|billing)\b/.test(m)) return "model_config";
  // network unreachable
  if (/\b(econnrefused|enotfound|econnreset|etimedout|failed.{0,10}fetch|network.{0,10}error|connection.{0,10}refused|no route to host|ssl.*error|certificate)\b/.test(m)) return "model_config";
  // model doesn't exist
  if (/\b(model.{0,30}(not found|does not exist|unavailable)|does not exist|no such model)\b/.test(m)) return "model_config";
  return null;
}
