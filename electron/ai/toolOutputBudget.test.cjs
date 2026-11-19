const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createContextCompactor, estimateTokens, resolveContextWindow } = require('./contextCompaction.cjs');
const { createToolResultStore, boundToolOutput } = require('./toolResultStore.cjs');

let root;
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-budget-')); });
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });
const store = (topicId = 'topic') => createToolResultStore({ topicId, baseDir: () => root });
const pair = (id, value) => [
  { role: 'assistant', content: [{ type: 'tool-call', toolName: 'fetch', toolCallId: id, input: {} }] },
  { role: 'tool', content: [{ type: 'tool-result', toolName: 'fetch', toolCallId: id, output: { type: 'json', value } }] },
];

it('prunes two huge fetch results before summary, retains pairs and makes all original evidence readable after restart', async () => {
  let summaries = 0;
  const resultStore = store();
  const compactor = createContextCompactor({ apiConfig: { modelName: 'unknown' }, resultStore,
    generateSummary: async () => { summaries++; return { text: 'summary' }; } });
  let messages = [{ role: 'user', content: '请查阅网页并回答' }];
  for (let i = 0; i < 2; i++) {
    const original = `HEAD-${i}` + 'x'.repeat(524288) + `IMPORTANT-END-${i}`;
    messages = [...messages, ...pair(`fetch-${i}`, { ok: true, content: original })];
    const result = await compactor.prepare(messages);
    expect(result?.checkpoint).toBeUndefined();
    messages = result?.messages || messages;
    expect(messages.filter(m => m.role === 'tool')).toHaveLength(i + 1);
    const output = messages.at(-1).content[0].output.value;
    expect(output.truncated).toBe(true);
    const restarted = store();
    const page = await restarted.read(output.resultId, { offset: 524000, maxTokens: 1000 });
    expect(page.content).toContain(`IMPORTANT-END-${i}`);
  }
  expect(summaries).toBe(0);
});

it('caps CJK and JSON results, preserves failure metadata, and isolates topic resources', async () => {
  const original = { ok: false, error: 'fetch failed', content: '中'.repeat(50000) };
  const output = await boundToolOutput(original, store(), 2000);
  expect(estimateTokens(JSON.stringify(output))).toBeLessThanOrEqual(2000);
  expect(output).toMatchObject({ ok: false, error: 'fetch failed', truncated: true });
  const page = await store().read(output.resultId, { maxTokens: 600 });
  expect(estimateTokens(page.content)).toBeLessThanOrEqual(600);
  await expect(store('other').read(output.resultId)).rejects.toThrow();
  await expect(store().read('../outside')).rejects.toThrow();
});

it('still summarizes old conversation when pruning tools cannot relieve pressure', async () => {
  let summaries = 0;
  const compactor = createContextCompactor({ apiConfig: { modelName: 'gpt-3.5-turbo' }, resultStore: store(),
    generateSummary: async () => { summaries++; return { text: '目标和约束仍保留。' }; } });
  const result = await compactor.prepare([{ role: 'user', content: '旧约束' }, { role: 'assistant', content: '中'.repeat(20000) }, { role: 'user', content: '继续' }]);
  expect(result.checkpoint.reason).toBe('auto');
  expect(summaries).toBeGreaterThan(0);
  expect(result.messages.at(-1).content).toBe('继续');
});

it('honors explicit routed context windows rather than an alias fallback', () => {
  expect(resolveContextWindow('gateway-alias', 1000000)).toBe(1000000);
  expect(resolveContextWindow('gateway-alias', -1)).toBe(128000);
});

it('keeps escaped output within budget and does not skip characters when a preview is pruned again', async () => {
  const { pruneToolResults } = require('./toolResultStore.cjs');
  const original = { ok: true, content: '"\n\\中😀'.repeat(20000) + 'END-EVIDENCE' };
  const output = await boundToolOutput(original, store(), 6000);
  expect(estimateTokens(JSON.stringify(output))).toBeLessThanOrEqual(6000);
  expect(output.tail).toContain('END-EVIDENCE');
  const pruned = await pruneToolResults(pair('x', output), store(), 1000);
  const next = pruned.at(-1).content[0].output.value;
  expect(next.resultId).toBe(output.resultId);
  expect(next.nextOffset).toBe(next.content.length);
  expect(estimateTokens(JSON.stringify(next))).toBeLessThanOrEqual(1000);
  const page = await store().read(next.resultId, { offset: next.nextOffset, maxTokens: 500 });
  expect(JSON.stringify(original).slice(0, next.nextOffset) + page.content).toBe(JSON.stringify(original).slice(0, next.nextOffset + page.content.length));
});

it('publishes duplicate parallel resources atomically without incomplete reads', async () => {
  const text = '😀中'.repeat(10000);
  const ids = await Promise.all(Array.from({ length: 8 }, async () => {
    const resultId = await store().put(text);
    expect((await store().read(resultId)).content).toBeTruthy();
    return resultId;
  }));
  expect(new Set(ids).size).toBe(1);
  expect(fs.readdirSync(path.join(root, 'topic'))).toHaveLength(1);
});
