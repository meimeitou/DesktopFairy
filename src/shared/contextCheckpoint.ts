import type { ApiMessage } from './chatMessages';

/** A durable model window at a transcript boundary; display history stays intact. */
export interface ContextCheckpoint {
  id: string;
  version: 1;
  reason: 'manual' | 'auto' | 'overflow';
  summary: string;
  createdAt: number;
  messages: ApiMessage[];
  coveredMessageCount: number;
  retainedMessageCount: number;
  beforeTokens: number;
  afterTokens: number;
}

export function normalizeContextCheckpoint(raw: unknown): ContextCheckpoint | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const value = raw as ContextCheckpoint;
  if (value.version !== 1 || typeof value.id !== 'string' || !value.id ||
      typeof value.summary !== 'string' || !value.summary.trim() ||
      !['manual', 'auto', 'overflow'].includes(value.reason) ||
      !Array.isArray(value.messages) || !value.messages.length ||
      !value.messages.every((m) => m && ['user', 'assistant', 'tool'].includes(m.role) &&
        (typeof m.content === 'string' || Array.isArray(m.content))) ||
      ![value.createdAt, value.coveredMessageCount, value.retainedMessageCount, value.beforeTokens, value.afterTokens]
        .every((n) => Number.isFinite(n) && n >= 0)) return undefined;
  return value;
}
