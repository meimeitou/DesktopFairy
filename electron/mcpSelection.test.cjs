const fs = require('fs');
const os = require('os');
const path = require('path');
const { registerChatSessionHandlers } = require('./chatSessionService.cjs');

let root, handlers, store;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-selection-'));
  handlers = {};
  store = registerChatSessionHandlers({
    ipcMain: { handle: (channel, fn) => { handlers[channel] = fn; } },
    sessionPath: () => path.join(root, 'legacy.json'),
    topicsIndexPath: () => path.join(root, 'topics.json'),
    sessionsDir: () => path.join(root, 'sessions'),
    toolResultsDir: () => path.join(root, 'results'),
    chatLogsDir: () => path.join(root, 'logs'),
  });
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));
const create = async () => (await handlers['chat:topics:create']({}, { agentId: 'agent' })).topic;
const update = (topicId, mcpServerIds) => handlers['chat:topics:updateMeta']({}, { topicId, mcpServerIds });

it('persists overrides and explicit empty selections; null restores defaults', async () => {
  const a = await create();
  const b = await create();
  expect(store.getMcpServerIds(a.id)).toBeUndefined();
  expect((await update(a.id, ['dns', 'dns'])).ok).toBe(true);
  expect(store.getMcpServerIds(a.id)).toEqual(['dns']);
  expect(store.getMcpServerIds(b.id)).toBeUndefined();
  await update(a.id, []);
  expect(store.getMcpServerIds(a.id)).toEqual([]);
  await update(a.id, null);
  expect(store.getTopic(a.id)).not.toHaveProperty('mcpServerIds');
});

it('copies independent overrides when forking, including an explicit empty list', async () => {
  for (const ids of [['dns'], []]) {
    const source = await create();
    await update(source.id, ids);
    const fork = await handlers['chat:topics:fork']({}, { sourceTopicId: source.id, uptoMessageId: 'u',
      messages: [{ id: 'u', role: 'user', content: 'hello', timestamp: 1 }] });
    expect(fork.ok).toBe(true);
    expect(store.getMcpServerIds(fork.topic.id)).toEqual(ids);
    await update(source.id, ['changed']);
    expect(store.getMcpServerIds(fork.topic.id)).toEqual(ids);
  }
});

it('persists drawer preferences without creating phantom sidebar topics', async () => {
  await create();
  const before = store.readStore().topics.length;
  await update('terminal:tab-1', ['dns']);
  expect(store.getMcpServerIds('terminal:tab-1')).toEqual(['dns']);
  expect(store.getMcpServerIds('terminal:tab-2')).toBeUndefined();
  expect(store.readStore().topics).toHaveLength(before);
  await update('terminal:tab-1', null);
  expect(store.getMcpServerIds('terminal:tab-1')).toBeUndefined();
});

it('rejects invalid choices and reports write failure without claiming success', async () => {
  const topic = await create();
  expect((await update(topic.id, ['dns', 1])).ok).toBe(false);
  fs.unlinkSync(path.join(root, 'topics.json'));
  fs.mkdirSync(path.join(root, 'topics.json'));
  const silence = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try { expect((await update('terminal:tab', ['dns'])).ok).toBe(false); }
  finally { silence.mockRestore(); warn.mockRestore(); }
});
