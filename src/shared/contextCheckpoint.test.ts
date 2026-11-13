import { describe, expect, it } from 'vitest';
import { applyContextCheckpoint, applyChunks, applyDone, applyError, beginSend, emptyAgentSessionState, toggleClearMarker } from './agentSession';
import { buildAgentHistoryMessages, filterForAgentHistory, type ChatMsg } from './chatMessages';
import { buildChatSession, MAX_SESSION_BYTES, normalizeChatSession, trimSessionForStorage } from './chatSession';
import type { ContextCheckpoint } from './contextCheckpoint';
import { estimateContextUsage } from './contextUsage';
import { hostsForContinuation } from './hostSelection';

const checkpoint: ContextCheckpoint = {
  id: 'checkpoint-1', version: 1, reason: 'manual', summary: '目标：修复问题。约束：保留用户文件。', createdAt: 100,
  messages: [
    { role: 'user', content: '[上下文摘要]\n目标：修复问题。约束：保留用户文件。' },
    { role: 'user', content: '最近的具体要求' },
    { role: 'assistant', content: '', tool_calls: [{ id: 'tool1', type: 'function', function: { name: 'read', arguments: '{"path":"/tmp/source"}' } }] },
    { role: 'tool', name: 'read', tool_call_id: 'tool1', content: '原始证据' },
  ],
  coveredMessageCount: 10, retainedMessageCount: 3, beforeTokens: 1000, afterTokens: 200,
};

function seed() {
  return beginSend({ ...emptyAgentSessionState(), messages: [
    { id: 'early', role: 'user' as const, content: '旧历史' },
    { id: 'old-reply', role: 'assistant' as const, content: '已完成' },
  ] }, { requestId: 'r1', userText: '最新任务' });
}

describe('durable context checkpoints', () => {
  it('keeps display history but replays exactly snapshot + new output across storage/restart', () => {
    let state = applyContextCheckpoint(seed(), checkpoint);
    expect(state.messages.find((m) => m.id === 'early')).toBeDefined();
    state = applyChunks(state, [{ partId: 'new', text: '继续执行结果' }], '');
    state = applyDone(state, { requestId: 'r1' }).state;
    const session = normalizeChatSession(JSON.parse(JSON.stringify(buildChatSession(state.messages, '', []))));
    const apiMessages = buildAgentHistoryMessages(filterForAgentHistory(session.messages));
    expect(apiMessages).toEqual([...checkpoint.messages, { role: 'assistant', content: '继续执行结果' }]);
    expect(JSON.stringify(apiMessages)).not.toContain('旧历史');
    expect(apiMessages.filter((m) => m.role === 'tool')).toHaveLength(1);
  });

  it('is idempotent on stream replay and does not clear on cancellation or empty checkpoint', () => {
    const initial = seed();
    const first = applyContextCheckpoint(initial, checkpoint);
    expect(applyContextCheckpoint(first, checkpoint)).toBe(first);
    expect(applyContextCheckpoint(initial, { ...checkpoint, summary: '' })).toBe(initial);
    const aborted = applyDone(initial, { requestId: 'r1', isCompact: true, aborted: true }).state;
    expect(aborted.messages.some((m) => m.type === 'clear')).toBe(false);
    const afterCommitted = applyDone(first, { requestId: 'r1', aborted: true }).state;
    expect(buildAgentHistoryMessages(afterCommitted.messages)).toEqual(checkpoint.messages);
  });

  it('handles multiple checkpoints and explicit clear without reviving old context', () => {
    let state = applyContextCheckpoint(seed(), checkpoint);
    state = applyContextCheckpoint(state, { ...checkpoint, id: 'checkpoint-2', summary: 'new', messages: [{ role: 'user', content: 'new snapshot' }] });
    expect(buildAgentHistoryMessages(state.messages)).toEqual([{ role: 'user', content: 'new snapshot' }]);
    state = toggleClearMarker(state);
    expect(buildAgentHistoryMessages(state.messages)).toEqual([]);
    state = toggleClearMarker(state);
    expect(buildAgentHistoryMessages(state.messages)).toEqual([{ role: 'user', content: 'new snapshot' }]);
  });

  it('keeps reasoning and errors after the boundary without altering archived replies', () => {
    let state = applyContextCheckpoint(seed(), checkpoint);
    state = applyChunks(state, [], 'new reasoning');
    expect(state.messages.find((m) => m.id === 'old-reply')!.reasoning).toBeUndefined();
    expect(state.messages.at(-1)!.reasoning).toBe('new reasoning');
    state = applyError(state, { requestId: 'r1', message: 'provider failed' }).state;
    expect(state.messages.at(-1)!.error).toBe(true);
    expect(state.messages.find((m) => m.id === 'old-reply')!.error).toBeUndefined();
    expect(buildAgentHistoryMessages(state.messages)).toEqual(checkpoint.messages);
  });

  it('does not mutate a snapshot when new tool calls follow its final assistant reply', () => {
    const copy = { ...checkpoint, messages: [{ role: 'user' as const, content: 'goal' }, { role: 'assistant' as const, content: 'next step' }] };
    const state = applyContextCheckpoint(seed(), copy);
    state.messages.push({ id: 'new-tool', role: 'assistant', type: 'tool', content: '', toolName: 'read', toolCallId: 'next', toolArgs: '{}', toolStatus: 'done', toolResultPreview: 'evidence' });
    const first = buildAgentHistoryMessages(state.messages);
    expect(buildAgentHistoryMessages(state.messages)).toEqual(first);
    expect(copy.messages[1]).toEqual({ role: 'assistant', content: 'next step' });
  });

  it('preserves machine selection for continuation across a compaction boundary', () => {
    const selectedHosts = [{ id: 'h', name: 'server', host: 'localhost', port: 22, user: 'u' }];
    const initial = seed();
    initial.messages.at(-2)!.selectedHosts = selectedHosts;
    const state = applyContextCheckpoint(initial, checkpoint);
    expect(hostsForContinuation(state.messages)).toEqual(selectedHosts);
    expect(hostsForContinuation(toggleClearMarker(state).messages)).toEqual([]);
  });

  it('accounts for retained snapshot tokens and reports real pressure before auto compaction', () => {
    const state = applyContextCheckpoint(seed(), checkpoint);
    const result = estimateContextUsage({ messages: state.messages, contextWindow: 128000 });
    expect(result.breakdown.history).toBeGreaterThan(50);
    const overloaded = estimateContextUsage({ messages: [{ id: 'large', role: 'user', content: '中'.repeat(5000) }], contextWindow: 1000 });
    expect(overloaded.percent).toBe(100);
    expect(overloaded.trimmedMessages).toHaveLength(1);
    expect(overloaded.discardedCount).toBe(0);
  });

  it('evicts archived transcript rather than dropping checkpoint or unsummarized active messages', () => {
    const history: ChatMsg[] = Array.from({ length: 550 }, (_, i) => ({ id: `archive-${i}`, role: 'user', content: 'x'.repeat(10000) }));
    let state = applyContextCheckpoint({ ...emptyAgentSessionState(), messages: history }, checkpoint);
    state = applyChunks(state, [{ partId: 'new', text: 'not summarized yet' }], '');
    const stored = trimSessionForStorage(buildChatSession(state.messages, '', []));
    expect(JSON.stringify(stored).length).toBeLessThan(MAX_SESSION_BYTES);
    const restored = normalizeChatSession(JSON.parse(JSON.stringify(stored)));
    expect(buildAgentHistoryMessages(restored.messages)).toEqual([...checkpoint.messages, { role: 'assistant', content: 'not summarized yet' }]);
  });
});
