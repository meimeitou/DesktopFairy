const fs = require('fs');
const os = require('os');
const path = require('path');
const { AgentInputQueue } = require('./AgentInputQueue.cjs');
let dir;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-inputs-')); });
afterEach(() => { fs.rmSync(dir, { force: true, recursive: true }); });
const input = (id) => ({ message: { id, content: id, attachments: [{ path: '/tmp/a.png', name: 'a.png', kind: 'image' }] }, apiMessage: { role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,YQ==' } }] } });
it('persists FIFO inputs and prepared attachments across restarts, without automatically consuming', () => {
  const q = new AgentInputQueue(dir);
  q.enqueue('terminal:t', input('a'));
  q.enqueue('terminal:t', input('b'));
  q.enqueue('terminal:t', input('a'));
  const restored = new AgentInputQueue(dir);
  expect(restored.pending('terminal:t').map((r) => r.message.id)).toEqual(['a', 'b']);
  expect(restored.pending('terminal:t')[0].message.agentInputContent).toEqual(input('a').apiMessage.content);
  expect(restored.pending('other')).toEqual([]);
  expect(fs.readdirSync(dir)).toHaveLength(1);
});
it('withdraw and consume have exactly one winner; consumed ids remain idempotent', () => {
  const q = new AgentInputQueue(dir);
  q.enqueue('t', input('a'));
  expect(q.withdraw('t', 'a').id).toBe('a');
  expect(q.consume('t', 'r')).toEqual([]);
  q.enqueue('t', input('b'));
  expect(q.consume('t', 'r')).toHaveLength(1);
  expect(q.withdraw('t', 'b')).toBeNull();
  q.enqueue('t', input('b'));
  expect(q.pending('t')).toEqual([]);
  q.acknowledge('t', ['b']);
  expect(new AgentInputQueue(dir).snapshot('t')[0].saved).toBe(true);
  q.clear('t');
  expect(new AgentInputQueue(dir).snapshot('t')).toEqual([]);
});
it('does not acknowledge a write that failed', () => {
  const q = new AgentInputQueue(dir);
  q.enqueue('t', input('a'));
  const write = fs.writeFileSync;
  fs.writeFileSync = () => { throw new Error('disk full'); };
  try { expect(() => q.consume('t', 'r')).toThrow('disk full'); }
  finally { fs.writeFileSync = write; }
  expect(q.pending('t')).toHaveLength(1);
});
