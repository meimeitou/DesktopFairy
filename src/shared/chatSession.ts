import type { ChatAttachment } from "./chatAttachments";
import type { ChatMsg } from "./chatMessages";

export const CHAT_SESSION_VERSION = 1 as const;
export const MAX_STORED_MESSAGES = 500;
export const MAX_SESSION_BYTES = 2 * 1024 * 1024;

export interface ChatSession {
  version: typeof CHAT_SESSION_VERSION;
  updatedAt: number;
  messages: ChatMsg[];
  draftInput?: string;
  draftAttachments?: ChatAttachment[];
}

export function emptyChatSession(): ChatSession {
  return {
    version: CHAT_SESSION_VERSION,
    updatedAt: Date.now(),
    messages: [],
    draftInput: "",
    draftAttachments: [],
  };
}

function isChatMsg(value: unknown): value is ChatMsg {
  if (!value || typeof value !== "object") return false;
  const m = value as ChatMsg;
  return (
    typeof m.id === "string" &&
    (m.role === "user" || m.role === "assistant") &&
    typeof m.content === "string"
  );
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
    ? data.messages.filter(isChatMsg)
    : [];
  return {
    version: CHAT_SESSION_VERSION,
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

export function trimSessionForStorage(session: ChatSession): ChatSession {
  let messages = session.messages;
  if (messages.length > MAX_STORED_MESSAGES) {
    messages = messages.slice(messages.length - MAX_STORED_MESSAGES);
  }

  let next = { ...session, messages, updatedAt: Date.now() };
  while (messages.length > 0) {
    const json = JSON.stringify(next);
    if (json.length <= MAX_SESSION_BYTES) break;
    messages = messages.slice(1);
    next = { ...next, messages };
  }

  return next;
}
