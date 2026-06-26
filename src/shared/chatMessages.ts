import type { ChatAttachment } from "./chatAttachments";
import { isImageExt } from "./chatAttachments";
import { formatToolEvidenceForApi } from "./toolEvidence";

export type ChatRole = "user" | "assistant";

export interface ChatMsg {
  id: string;
  role: ChatRole;
  content: string;
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

export type ApiMessage = {
  role: "system" | "user" | "assistant";
  content: string | ApiContentPart[];
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

function formatToolHistoryBlock(tools: ChatMsg[]): string {
  if (tools.length === 0) return "";
  const lines = tools.map((t) => formatToolEvidenceForApi(t));
  return `<previous_tool_results>\n${lines.join("\n")}\n</previous_tool_results>`;
}

/** Agent history including prior tool turns as context blocks. */
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
        tools.push(filtered[i]);
        i++;
      }
      const block = formatToolHistoryBlock(tools);
      if (block.trim()) {
        result.push({ role: "user", content: block });
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
