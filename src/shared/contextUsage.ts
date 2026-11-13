import contextWindows from "../../electron/ai/contextWindows.json";
import type { ChatAttachment } from "./chatAttachments";
import { isImageExt } from "./chatAttachments";
import { filterAfterContextClear, type ChatMsg } from "./chatMessages";
import { formatToolEvidenceForApi } from "./toolEvidence";
import type { AgentConfig } from "./agent";

/** Default context window when model is unknown. */
export const DEFAULT_CONTEXT_WINDOW = 128_000;

/** Fraction of context window reserved for the next outbound request. */
export const SEND_BUDGET_RATIO = 0.8;

/** ponytail: fixed overhead for agent tool/skill blocks in system prompt — upgrade path: IPC exact length */
export const AGENT_SYSTEM_OVERHEAD_TOKENS = 2_000;

/** ponytail: vision images are not counted precisely — upgrade path: provider-specific vision token API */
export const IMAGE_ATTACHMENT_TOKEN_ESTIMATE = 1_024;

const CONTEXT_WINDOW_BY_PREFIX = contextWindows.prefixes as [string, number][];

const CJK_RE = /[\u3000-\u9fff\uf900-\ufaff\uac00-\ud7af]/;

/** Conservative token estimate: CJK 1 char ≈ 1 token, ASCII ~4 chars ≈ 1 token. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  let tokens = 0;
  let asciiRun = 0;
  for (const ch of text) {
    if (CJK_RE.test(ch)) {
      if (asciiRun > 0) {
        tokens += Math.ceil(asciiRun / 4);
        asciiRun = 0;
      }
      tokens += 1;
    } else {
      asciiRun += 1;
    }
  }
  if (asciiRun > 0) tokens += Math.ceil(asciiRun / 4);
  return tokens;
}

export function resolveContextWindow(modelName: string): number {
  const normalized = modelName.trim().toLowerCase();
  if (!normalized) return DEFAULT_CONTEXT_WINDOW;
  for (const [prefix, window] of CONTEXT_WINDOW_BY_PREFIX) {
    if (normalized.startsWith(prefix) || normalized.includes(prefix)) {
      return window;
    }
  }
  return DEFAULT_CONTEXT_WINDOW;
}

export function sendTokenBudget(contextWindow: number): number {
  return Math.floor(contextWindow * SEND_BUDGET_RATIO);
}

function messageTextForEstimate(msg: ChatMsg): string {
  if (msg.type === "tool") return formatToolEvidenceForApi(msg);
  return msg.content || "";
}

export function estimateMessageTokens(msg: ChatMsg): number {
  if (msg.contextCheckpoint) return estimateTokens(JSON.stringify(msg.contextCheckpoint.messages,
    (_key, value) => value?.type === 'image_url' ? '[图片约1024tokens]' : value)) +
      msg.contextCheckpoint.messages.reduce((n, m) => n + (Array.isArray(m.content) ? m.content.filter((p) => p.type === 'image_url').length * 1024 : 0), 0);
  return estimateTokens(messageTextForEstimate(msg)) + (msg.type === 'tool' ? estimateTokens(msg.toolArgs || '') : 0);
}

export function estimateMessagesTokens(messages: ChatMsg[]): number {
  return messages.reduce((sum, m) => sum + estimateMessageTokens(m), 0);
}

export function estimateAttachmentTokens(attachments: ChatAttachment[]): number {
  let total = 0;
  for (const file of attachments) {
    if (isImageExt(file.ext)) {
      total += IMAGE_ATTACHMENT_TOKEN_ESTIMATE;
    } else {
      // Text files are inlined at send time; size is a rough proxy until read.
      total += Math.ceil(file.size / 4);
    }
  }
  return total;
}

export function estimateAgentSystemPromptTokens(agent: {
  soul?: string;
  user?: string;
}): number {
  const soul = agent.soul?.trim() || "";
  const user = agent.user?.trim() || "";
  let tokens = estimateTokens(soul);
  if (user) tokens += estimateTokens(user) + estimateTokens("# 用户档案\n");
  tokens += AGENT_SYSTEM_OVERHEAD_TOKENS;
  return tokens;
}

/**
 * Model actually in effect for a chat session: the agent's configured model.
 */
export function resolveActiveModelName(agent: AgentConfig): string {
  return agent.modelName.trim();
}

export function buildTrimOptions(params: {
  contextWindow: number;
  systemTokens?: number;
  draftInput?: string;
  draftAttachments?: ChatAttachment[];
}): { maxTokens: number; reserveTokens: number } {
  const systemTokens = params.systemTokens ?? 0;
  const draftInput = params.draftInput ?? "";
  const draftAttachments = params.draftAttachments ?? [];
  return {
    maxTokens: sendTokenBudget(params.contextWindow),
    reserveTokens:
      systemTokens +
      estimateTokens(draftInput) +
      estimateAttachmentTokens(draftAttachments),
  };
}

export interface ContextUsageBreakdown {
  system: number;
  history: number;
  input: number;
  attachments: number;
}

export interface ContextUsageResult {
  contextWindow: number;
  sendBudget: number;
  used: number;
  percent: number;
  remaining: number;
  breakdown: ContextUsageBreakdown;
  discardedCount: number;
  trimmedMessages: ChatMsg[];
  isEstimate: boolean;
  lastServerPromptTokens?: number;
  lastServerCompletionTokens?: number;
}

export interface EstimateContextUsageInput {
  messages: ChatMsg[];
  input?: string;
  attachments?: ChatAttachment[];
  systemTokens?: number;
  contextWindow: number;
  lastPromptTokens?: number;
  lastCompletionTokens?: number;
  lastUsageMessageCount?: number;
}

export function trimMessagesForTokenBudget(
  messages: ChatMsg[],
  options: {
    maxTokens: number;
    reserveTokens?: number;
  },
): { kept: ChatMsg[]; discardedCount: number } {
  const reserve = Math.max(0, options.reserveTokens ?? 0);
  const budget = Math.max(0, options.maxTokens - reserve);
  if (messages.length === 0) return { kept: [], discardedCount: 0 };

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

  return {
    kept,
    discardedCount: Math.max(0, messages.length - kept.length),
  };
}

function messagesAfterContextClear(messages: ChatMsg[]): ChatMsg[] {
  return filterAfterContextClear(messages).filter((m) => m.type !== 'clear');
}

export function estimateContextUsage(
  input: EstimateContextUsageInput,
): ContextUsageResult {
  const {
    messages: rawMessages,
    input: draftInput = "",
    attachments = [],
    systemTokens = 0,
    contextWindow,
    lastPromptTokens,
    lastCompletionTokens,
    lastUsageMessageCount,
  } = input;

  const messages = messagesAfterContextClear(rawMessages);

  const sendBudget = sendTokenBudget(contextWindow);
  const draftInputTokens = estimateTokens(draftInput);
  const draftAttachmentTokens = estimateAttachmentTokens(attachments);
  // Main compacts the whole active context. Do not hide pressure by displaying
  // a silently trimmed suffix that no longer matches the actual request.
  const kept = messages;
  const discardedCount = 0;

  const historyFromTrim = estimateMessagesTokens(kept);

  // Server usage is last-request billing (tool schemas + in-loop full results +
  // reasoning completion). The meter is "what the next send will carry", so
  // keep the billed numbers as a footnote only.
  const hasServerBaseline =
    typeof lastPromptTokens === "number" &&
    lastPromptTokens > 0 &&
    typeof lastUsageMessageCount === "number" &&
    lastUsageMessageCount >= 0 &&
    lastUsageMessageCount <= messages.length &&
    messages.length > 0;

  const used =
    systemTokens +
    historyFromTrim +
    draftInputTokens +
    draftAttachmentTokens;

  const cappedUsed = Math.min(used, contextWindow);
  const percent = contextWindow > 0 ? (cappedUsed / contextWindow) * 100 : 0;

  return {
    contextWindow,
    sendBudget,
    used: cappedUsed,
    percent,
    remaining: Math.max(0, contextWindow - cappedUsed),
    breakdown: {
      system: systemTokens,
      history: historyFromTrim,
      input: draftInputTokens,
      attachments: draftAttachmentTokens,
    },
    discardedCount,
    trimmedMessages: kept,
    isEstimate: true,
    lastServerPromptTokens: hasServerBaseline ? lastPromptTokens : undefined,
    lastServerCompletionTokens:
      hasServerBaseline &&
      typeof lastCompletionTokens === "number" &&
      lastCompletionTokens >= 0
        ? lastCompletionTokens
        : undefined,
  };
}
