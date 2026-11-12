const { manager } = require('./streamManager/AiStreamManager.cjs');
const runtime = require('./agentInputRuntime.cjs');
const { registerAiStreamHandlers } = require('../aiStreamService.cjs');
let handlers;
const received = [];
const window = () => ({ isDestroyed: () => false, mainFrame: { isDestroyed: () => false, send: (channel, payload) => received.push({ channel, payload }) } });
const payload = { topicId: 'input-test', requestId: 'r', input: { message: { id: 'm', content: 'followup' }, apiMessage: { role: 'user', content: 'followup' } } };
beforeEach(() => {
  runtime.configure(null);
  received.length = 0;
  handlers = {};
  registerAiStreamHandlers({ handle: (channel, fn) => { handlers[channel] = fn; } }, { getWindows: () => [] });
  manager.activeStreams.set('input-test', { requestId: 'r', status: 'streaming', controller: new AbortController(), listeners: new Set(), buffer: [], legacyBuffer: [], legacyBase: 0, legacyCursors: new WeakMap() });
});
afterEach(() => { manager.activeStreams.delete('input-test'); manager.pendingListeners.delete('input-test'); });
it('accepts matching active inputs idempotently and broadcasts to attached windows', async () => {
  const sender = window();
  const other = window();
  manager.activeStreams.get('input-test').listeners.add(sender).add(other);
  expect(handlers['ai:stream_enqueue']({ sender }, payload).mode).toBe('queued');
  expect(handlers['ai:stream_enqueue']({ sender }, payload).mode).toBe('queued');
  expect(runtime.queue.pending('input-test')).toHaveLength(1);
  expect(received).toHaveLength(4);
  await expect(handlers['ai:stream_attach']({ sender }, { topicId: 'input-test' })).resolves.toMatchObject({ inputs: [{ status: 'pending' }] });
});
it.each(['sealed', 'stopped', 'stale-request'])('rejects %s inputs explicitly without losing or accepting a draft', (condition) => {
  const entry = manager.activeStreams.get('input-test');
  if (condition === 'sealed') entry.acceptingInput = false;
  if (condition === 'stopped') entry.controller.abort();
  if (condition === 'stale-request') entry.requestId = 'different';
  expect(handlers['ai:stream_enqueue']({ sender: window() }, payload)).toEqual({ mode: 'inactive' });
  expect(runtime.queue.pending('input-test')).toEqual([]);
});
it('withdraws from an idle topic and synchronizes windows waiting to attach', () => {
  runtime.queue.enqueue('input-test', payload.input);
  manager.activeStreams.delete('input-test');
  manager.pendingListeners.set('input-test', new Set([window()]));
  const result = handlers['ai:stream_withdraw']({ sender: window() }, { topicId: 'input-test', messageId: 'm' });
  expect(result.message.id).toBe('m');
  expect(received).toHaveLength(2);
  expect(received.every((e) => !e.payload.items.length)).toBe(true);
});

it('keeps queue subscribers after the completed stream replay buffer expires', () => {
  vi.useFakeTimers();
  try {
    const listener = window();
    const entry = manager.activeStreams.get('input-test');
    entry.status = 'done';
    entry.listeners.add(listener);
    runtime.queue.enqueue('input-test', payload.input);
    manager.scheduleGrace('input-test');
    vi.advanceTimersByTime(30_000);
    expect(manager.activeStreams.has('input-test')).toBe(false);
    expect(manager.pendingListeners.get('input-test').has(listener)).toBe(true);
    handlers['ai:stream_withdraw']({ sender: window() }, { topicId: 'input-test', messageId: 'm' });
    expect(received).toHaveLength(2);
  } finally { vi.useRealTimers(); }
});

it('updates a sender that has read the queue but has not attached to the live stream yet', () => {
  runtime.queue.enqueue('input-test', payload.input);
  manager.activeStreams.get('input-test').listeners.add(window());
  handlers['ai:stream_withdraw']({ sender: window() }, { topicId: 'input-test', messageId: 'm' });
  expect(received).toHaveLength(2);
});
