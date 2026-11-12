import { describe, expect, it } from 'vitest';
import { applyChunks, applyInputMessages, beginSend, emptyAgentSessionState } from './agentSession';
import { buildAgentHistoryMessages, type ChatMsg } from './chatMessages';
import { normalizeChatSession } from './chatSession';

const supplement: ChatMsg = { id: 'supplement', role: 'user', content: 'change direction', agentInputContent: 'change direction\n<file>content</file>' };
describe('agent input boundaries', () => {
  it('keeps old streamed content before the supplement and starts a new assistant reply', () => {
    let state = beginSend(emptyAgentSessionState(), { requestId: 'r', userText: 'original' });
    state = applyChunks(state, [{ partId: 'p', text: 'old answer' }], '');
    state = applyInputMessages(state, [supplement]);
    state = applyChunks(state, [], 'new reasoning');
    state = applyChunks(state, [{ partId: 'q', text: 'new answer' }], '');
    expect(state.messages[0].reasoning).toBeUndefined();
    expect(state.messages.at(-1)?.reasoning).toBe('new reasoning');
    expect(state.messages.map((m) => m.content)).toEqual(['original', 'old answer', 'change direction', 'new answer']);
    expect(applyInputMessages(state, [supplement])).toBe(state);
  });
  it('orders queued inputs before a new manual send that was already rendered', () => {
    const later: ChatMsg = { id: 'later', role: 'user', content: 'later' };
    const state = { ...emptyAgentSessionState(), messages: [later] };
    expect(applyInputMessages(state, [supplement, later]).messages.slice(0, -1).map((m) => m.id)).toEqual(['supplement', 'later']);
  });
  it('preserves prepared attachment content through session normalization and API history', () => {
    const session = normalizeChatSession({ version: 2, messages: [supplement] });
    expect(buildAgentHistoryMessages(session.messages)[0].content).toBe(supplement.agentInputContent);
  });
});

it('creates a user message for an attachment-only send', () => {
  const state = beginSend(emptyAgentSessionState(), { requestId: 'r', userText: '', attachments: [
    { id: 'a', name: 'a.png', path: '/tmp/a.png', ext: '.png', kind: 'image', size: 1 },
  ] });
  expect(state.messages[0].role).toBe('user');
  expect(state.messages[0].attachments).toHaveLength(1);
});
