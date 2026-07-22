import type { ChatAttachment } from "./chatAttachments";
import type { ChatMsg } from "./chatMessages";

export const CHAT_SESSION_VERSION = 2 as const;
export type ChatSessionVersion = 1 | typeof CHAT_SESSION_VERSION;

export const MAX_STORED_MESSAGES = 500;
export const MAX_SESSION_BYTES = 4 * 1024 * 1024;
export const TOOL_RESULT_INLINE_PREVIEW_MAX = 16 * 1024;
export const TOOL_RESULT_STORAGE_PREVIEW_MAX = 4 * 1024;

export interface ChatSession {
  version: ChatSessionVersion;
  updatedAt: number;
  messages: ChatMsg[];
  draftInput?: string;
  draftAttachments?: ChatAttachment[];
}

export const CHAT_TOPICS_VERSION = 1 as const;

export interface ChatTopic {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  orderKey: number;
}

export interface ChatTopicsStore {
  version: typeof CHAT_TOPICS_VERSION;
  activeId: string | null;
  topics: ChatTopic[];
}

export function emptyChatTopicsStore(): ChatTopicsStore {
  return {
    version: CHAT_TOPICS_VERSION,
    activeId: null,
    topics: [],
  };
}

export function normalizeChatTopicsStore(raw: unknown): ChatTopicsStore {
  if (!raw || typeof raw !== "object") return emptyChatTopicsStore();
  const data = raw as Partial<ChatTopicsStore>;
  const topics = Array.isArray(data.topics)
    ? data.topics.filter(
        (t): t is ChatTopic =>
          !!t &&
          typeof (t as ChatTopic).id === "string" &&
          typeof (t as ChatTopic).createdAt === "number",
      )
    : [];
  return {
    version: CHAT_TOPICS_VERSION,
    activeId:
      typeof data.activeId === "string" ? data.activeId : topics[0]?.id ?? null,
    topics,
  };
}

export function createChatTopic(id?: string, name?: string): ChatTopic {
  const now = Date.now();
  return {
    id: id ?? (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `topic-${now}-${Math.random().toString(36).slice(2, 10)}`),
    name: name ?? "",
    createdAt: now,
    updatedAt: now,
    orderKey: now,
  };
}

export function generateTopicTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.trim();
  if (!trimmed) return "新对话";
  return trimmed.length > 25 ? trimmed.slice(0, 25) + "..." : trimmed;
}

export function createEmptyChatSession(): ChatSession {
  return {
    version: CHAT_SESSION_VERSION,
    updatedAt: Date.now(),
    messages: [],
    draftInput: "",
    draftAttachments: [],
  };
}

export function emptyChatSession(): ChatSession {
  return createEmptyChatSession();
}

const STALE_TOOL_STATUSES = new Set([
  "streaming",
  "running",
  "awaiting_approval",
  "awaiting_input",
]);

function normalizeToolFields(m: ChatMsg): ChatMsg {
  return {
    id: m.id,
    role: m.role,
    content: typeof m.content === "string" ? m.content : "",
    type: "tool",
    error: m.error,
    attachments: m.attachments,
    timestamp: m.timestamp,
    toolName: typeof m.toolName === "string" ? m.toolName : undefined,
    toolCallId: typeof m.toolCallId === "string" ? m.toolCallId : undefined,
    toolArgs: typeof m.toolArgs === "string" ? m.toolArgs : undefined,
    toolApprovalId:
      typeof m.toolApprovalId === "string" ? m.toolApprovalId : undefined,
    toolStatus: m.toolStatus,
    toolMessage: typeof m.toolMessage === "string" ? m.toolMessage : undefined,
    toolResultPreview:
      typeof m.toolResultPreview === "string" ? m.toolResultPreview : undefined,
    toolResultRef:
      typeof m.toolResultRef === "string" ? m.toolResultRef : undefined,
    toolResultBytes:
      typeof m.toolResultBytes === "number" && Number.isFinite(m.toolResultBytes)
        ? m.toolResultBytes
        : undefined,
  };
}

function normalizeChatMessage(raw: unknown): ChatMsg | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as ChatMsg;
  if (
    typeof m.id !== "string" ||
    (m.role !== "user" && m.role !== "assistant") ||
    typeof m.content !== "string"
  ) {
    return null;
  }

  if (m.type === "tool") {
    let tool = normalizeToolFields(m);
    if (tool.toolStatus && STALE_TOOL_STATUSES.has(tool.toolStatus)) {
      tool = {
        ...tool,
        toolStatus: "error",
        toolMessage: tool.toolMessage || "会话恢复时工具未完成",
      };
    }
    return tool;
  }

  return {
    id: m.id,
    role: m.role,
    content: m.content,
    reasoning: typeof m.reasoning === "string" ? m.reasoning : undefined,
    type: m.type === "clear" ? "clear" : undefined,
    error: m.error === true,
    attachments: m.attachments,
    timestamp: m.timestamp,
  };
}

function normalizeAttachments(value: unknown): ChatAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ChatAttachment =>
      !!item &&
      typeof item === "object" &&
      typeof (item as ChatAttachment).id === "string" &&
      typeof (item as ChatAttachment).name === "string" &&
      typeof (item as ChatAttachment).path === "string"
  );
}

export function normalizeChatSession(raw: unknown): ChatSession {
  if (!raw || typeof raw !== "object") return emptyChatSession();
  const data = raw as Partial<ChatSession>;
  const messages = Array.isArray(data.messages)
    ? data.messages
        .map(normalizeChatMessage)
        .filter((m): m is ChatMsg => m !== null)
    : [];
  const version =
    data.version === CHAT_SESSION_VERSION || data.version === 1
      ? data.version
      : CHAT_SESSION_VERSION;
  return {
    version,
    updatedAt:
      typeof data.updatedAt === "number" && Number.isFinite(data.updatedAt)
        ? data.updatedAt
        : Date.now(),
    messages,
    draftInput: typeof data.draftInput === "string" ? data.draftInput : "",
    draftAttachments: normalizeAttachments(data.draftAttachments),
  };
}

export function buildChatSession(
  messages: ChatMsg[],
  draftInput: string,
  draftAttachments: ChatAttachment[]
): ChatSession {
  return {
    version: CHAT_SESSION_VERSION,
    updatedAt: Date.now(),
    messages,
    draftInput,
    draftAttachments,
  };
}

function trimToolPreviewForStorage(msg: ChatMsg): ChatMsg {
  if (msg.type !== "tool" || !msg.toolResultPreview) return msg;
  const max = msg.toolResultRef
    ? TOOL_RESULT_STORAGE_PREVIEW_MAX
    : TOOL_RESULT_INLINE_PREVIEW_MAX;
  if (msg.toolResultPreview.length <= max) return msg;
  return {
    ...msg,
    toolResultPreview: `${msg.toolResultPreview.slice(0, max)}…`,
  };
}

function sessionJsonSize(session: ChatSession): number {
  return JSON.stringify(session).length;
}

export function trimSessionForStorage(session: ChatSession): ChatSession {
  let messages = [...session.messages];
  if (messages.length > MAX_STORED_MESSAGES) {
    messages = messages.slice(messages.length - MAX_STORED_MESSAGES);
  }

  let next: ChatSession = {
    ...session,
    version: CHAT_SESSION_VERSION,
    messages,
    updatedAt: Date.now(),
  };

  const fits = () => sessionJsonSize(next) <= MAX_SESSION_BYTES;

  if (!fits()) {
    const trimmed = messages.map((m, i) =>
      i < messages.length - 3 ? trimToolPreviewForStorage(m) : m,
    );
    if (trimmed.some((m, i) => m !== messages[i])) {
      messages = trimmed;
      next = { ...next, messages };
    }
  }

  while (!fits() && messages.length > 1) {
    const dropIdx = messages.findIndex(
      (m) => m.role === "user" && m.type !== "clear",
    );
    if (dropIdx >= 0) {
      messages = messages.slice(0, dropIdx).concat(messages.slice(dropIdx + 1));
    } else {
      messages = messages.slice(1);
    }
    next = { ...next, messages };
  }

  while (!fits() && messages.length > 1) {
    messages = messages.slice(1);
    next = { ...next, messages };
  }

  return next;
}
