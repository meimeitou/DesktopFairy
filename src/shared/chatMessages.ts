import type { ChatAttachment } from "./chatAttachments";
import { isImageExt } from "./chatAttachments";
import type { ToolTerminalState } from "./ai/stream";
import { formatToolEvidenceForApi } from "./toolEvidence";

export type ChatRole = "user" | "assistant";

export interface ChatMsg {
  id: string;
  role: ChatRole;
  content: string;
  /** Model reasoning / chain-of-thought text (from `reasoning_content`). Display-only, never replayed to the model. */
  reasoning?: string;
  type?: "clear" | "tool";
  error?: boolean;
  attachments?: ChatAttachment[];
  timestamp?: number;
  toolName?: string;
  toolCallId?: string;
  toolArgs?: string;
  toolApprovalId?: string;
  toolStatus?:
    | "streaming"
    | "awaiting_approval"
    | "running"
    | "done"
    | "error"
    | "denied";
  toolMessage?: string;
  toolResultPreview?: string;
  /** Relative path under chat_tool_results/{topicId}/ */
  toolResultRef?: string;
  toolResultBytes?: number;
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
  return messages.slice(clearIndex + 1);
}

export function filterForApi(messages: ChatMsg[]): ChatMsg[] {
  return filterAfterContextClear(messages).filter(
    (m) =>
      m.type !== "clear" &&
      m.type !== "tool" &&
      !m.error &&
      !(m.role === "assistant" && !m.content?.trim()),
  );
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
    if (
      m.role === "assistant" &&
      m.type !== "tool" &&
      m.type !== "clear" &&
      !m.error
    ) {
      return i;
    }
  }
  return -1;
}

export const DEFAULT_API_MAX_MESSAGES = 40;
export const DEFAULT_API_MAX_CHARS = 24_000;

function messageCharLength(msg: ChatMsg): number {
  if (msg.type === "tool") {
    const preview = msg.toolResultPreview || "";
    const hint = msg.toolMessage || "";
    const summary = formatToolEvidenceForApi(msg);
    return Math.max(preview.length, hint.length, summary.length, msg.content.length);
  }
  return msg.content.length;
}

/** Keep newest messages within count/char budget for API requests. */
export function trimMessagesForApi(
  messages: ChatMsg[],
  options?: { maxMessages?: number; maxChars?: number }
): ChatMsg[] {
  const maxMessages = options?.maxMessages ?? DEFAULT_API_MAX_MESSAGES;
  const maxChars = options?.maxChars ?? DEFAULT_API_MAX_CHARS;
  if (messages.length === 0) return messages;

  const kept: ChatMsg[] = [];
  let totalChars = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const len = messageCharLength(msg);
    if (kept.length >= maxMessages) break;
    if (kept.length > 0 && totalChars + len > maxChars) break;
    kept.unshift(msg);
    totalChars += len;
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
  if (msg.toolStatus === "denied") {
    return JSON.stringify({
      ok: false,
      error: msg.toolMessage || "User denied tool execution",
    });
  }
  if (msg.toolStatus === "error") {
    return JSON.stringify({
      ok: false,
      error: msg.toolMessage || "Tool error",
    });
  }
  const preview = msg.toolResultPreview?.trim();
  if (preview) return preview;
  return JSON.stringify({
    ok: true,
    summary: formatToolEvidenceForApi(msg),
  });
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
    result.push({ role: m.role, content: m.content });
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

export function buildApiMessages(
  history: ChatMsg[],
  userText: string,
  attachmentPayloads: {
    textFiles: { name: string; text: string }[];
    images: { name: string; dataUrl: string }[];
  },
  systemPrompt?: string
): ApiMessage[] {
  const result: ApiMessage[] = [];
  if (systemPrompt?.trim()) {
    result.push({ role: "system", content: systemPrompt.trim() });
  }

  for (const m of history) {
    if (m.type === "clear" || m.error) continue;
    result.push({ role: m.role, content: m.content });
  }

  const textWithFiles = appendTextFileBlocks(
    userText,
    attachmentPayloads.textFiles
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

/** Prevent chunkBridge "running" from downgrading an active approval prompt. */
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
  // Approval prompt must not be masked by pre-execute streaming events.
  if (current === "awaiting_approval" && incoming === "streaming") {
    return false;
  }
  const rank: Record<NonNullable<ChatMsg["toolStatus"]>, number> = {
    streaming: 1,
    running: 2,
    awaiting_approval: 3,
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
      m.toolStatus === "awaiting_approval"
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
  const ext = name.includes(".") ? `.${name.split(".").pop()?.toLowerCase()}` : "";
  return (
    isImageExt(ext) ||
    [
      ".txt", ".md", ".markdown", ".json", ".csv", ".xml", ".yaml", ".yml",
      ".js", ".ts", ".tsx", ".jsx", ".py", ".html", ".css", ".log",
    ].includes(ext)
  );
}
