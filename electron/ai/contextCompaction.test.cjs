const { createContextCompactor, estimateMessages, isContextWindowError, splitHistory, toApiMessages } = require('./contextCompaction.cjs');
const { toCoreMessages } = require('./messages.cjs');
const user = (content) => ({ role: 'user', content });
const assistant = (content) => ({ role: 'assistant', content });
const pair = (id, output = 'evidence') => [
  { role: 'assistant', content: [{ type: 'tool-call', toolName: 'work', toolCallId: id, input: { file: '/tmp/source' } }] },
  { role: 'tool', content: [{ type: 'tool-result', toolName: 'work', toolCallId: id, output: { type: 'text', value: output } }] },
];
function setup(options = {}) {
  const calls = [];
  const compactor = createContextCompactor({
    apiConfig: { modelName: 'gpt-3.5-turbo' },
    generateSummary: async (args) => { calls.push(args); return { text: '目标：保留约束。下一步：继续验证。' }; },
    ...options,
  });
  return { compactor, calls };
}

it('summarizes the old prefix while preserving the last two full turns and tool pairs', async () => {
  const messages = [user('早期约束：只能写临时目录' + '过往任务细节'.repeat(100)), assistant('understood'), user('previous'), ...pair('c1'), assistant('checked'), user('latest'), ...pair('c2')];
  const { compactor, calls } = setup();
  const result = await compactor.compact(messages, 'manual');
  expect(calls[0].messages[0].content).toContain('早期约束');
  expect(calls[0].tools).toBeUndefined();
  expect(result.messages.slice(1)).toEqual(messages.slice(2));
  expect(result.checkpoint.retainedMessageCount).toBe(messages.length - 2);
  expect(toCoreMessages(result.checkpoint.messages)).toEqual(result.messages);
});

it('processes all oversized old user text in chunks without silently dropping its start or end', async () => {
  const old = 'EARLY_REQUIREMENT ' + '中'.repeat(40000) + ' END_REQUIREMENT';
  const { compactor, calls } = setup();
  await compactor.compact([user(old), assistant('done'), user('recent'), assistant('answer'), user('latest')], 'manual');
  expect(calls.length).toBeGreaterThan(2);
  expect(calls[0].messages[0].content).toContain('EARLY_REQUIREMENT');
  expect(calls.at(-1).messages[0].content).toContain('END_REQUIREMENT');
  expect(calls[1].messages[0].content).toContain('已有 checkpoint：\n目标：');
});

it('keeps the original window when a manual summary would increase its size', async () => {
  const messages = [user('old'), assistant('ok'), user('recent')];
  const before = JSON.stringify(messages);
  const { compactor } = setup({ generateSummary: async () => ({ text: '冗长摘要'.repeat(500) }) });
  expect(await compactor.compact(messages, 'manual')).toBeNull();
  expect(JSON.stringify(messages)).toBe(before);
});

it('counts tool inputs, schemas and system instructions when deciding to auto compact', async () => {
  const messages = [user('old'), assistant('ok'), user('recent'), ...pair('one')];
  messages[3].content[0].input = { text: 'x'.repeat(40000) };
  const { compactor, calls } = setup({ systemPrompt: 's'.repeat(4000), toolDefinitions: [{ schema: 't'.repeat(16000) }] });
  const result = await compactor.prepare(messages);
  expect(result.checkpoint.reason).toBe('auto');
  expect(calls.length).toBeGreaterThan(0);
  expect(result.checkpoint.afterTokens).toBeLessThan(result.checkpoint.beforeTokens);
  expect(result.messages.find((m) => m.content === 'recent')).toBeDefined();
});

it('calibrates against a single step input usage rather than cumulative billing', async () => {
  const messages = [user('a'.repeat(12000)), assistant('old'), user('b'.repeat(4000)), assistant('recent'), user('latest')];
  const { compactor } = setup();
  expect(await compactor.prepare(messages)).toBeNull();
  compactor.recordUsage({ inputTokens: 16000 });
  expect((await compactor.prepare(messages)).checkpoint.reason).toBe('auto');
});

it('never commits an empty, truncated, failed or cancelled summary', async () => {
  const messages = [user('old'), assistant('reply'), user('new')];
  for (const result of [{ text: '' }, { text: 'partial', finishReason: 'length' }]) {
    const { compactor } = setup({ generateSummary: async () => result });
    await expect(compactor.compact(messages, 'manual')).rejects.toThrow();
    expect(messages).toHaveLength(3);
  }
  const controller = new AbortController();
  const { compactor } = setup({ signal: controller.signal, generateSummary: async () => { controller.abort(); return { text: 'late' }; } });
  await expect(compactor.compact(messages, 'manual')).rejects.toMatchObject({ name: 'AbortError' });
});

it('shrinks a rejected summary chunk and retries without consuming that text', async () => {
  const calls = [];
  const { compactor } = setup({ generateSummary: async (args) => {
    calls.push(args.messages[0].content);
    if (calls.length === 1) throw new Error('maximum context length exceeded');
    return { text: 'summary' };
  } });
  await compactor.compact([user('FIRST ' + 'x'.repeat(40000) + ' LAST'), assistant('done'), user('recent')], 'manual');
  expect(calls.length).toBeGreaterThan(2);
  expect(calls[1]).toContain('FIRST');
  expect(calls.at(-1)).toContain('LAST');
});

it('fails clearly for oversized uncompressible current input and exhausted fixed overhead', async () => {
  const { compactor, calls } = setup();
  await expect(compactor.prepare([user('x'.repeat(100000))])).rejects.toThrow('最新输入');
  expect(calls).toHaveLength(0);
  const huge = setup({ toolDefinitions: [{ schema: 'x'.repeat(100000) }] });
  await expect(huge.compactor.prepare([user('hello')])).rejects.toThrow('工具定义');
});

it('safe suffix cuts never orphan tool results, and latest user survives a huge tool round', () => {
  const messages = [user('goal'), ...pair('large', 'x'.repeat(30000)), ...pair('small')];
  const { prefix, recent } = splitHistory(messages, 1000);
  expect(recent[0]).toEqual(messages[0]);
  expect(recent.slice(1)).toEqual(messages.slice(3));
  expect(prefix.at(-1).role).toBe('tool');
});

it('round-trips retained images and tool output types through durable JSON', () => {
  const original = [...pair('x'), { role: 'user', content: [{ type: 'image', image: Buffer.from([1, 2, 3]), mediaType: 'image/png' }, { type: 'text', text: 'inspect' }] }];
  const restored = toCoreMessages(JSON.parse(JSON.stringify(toApiMessages(original))));
  expect(restored).toEqual(original);
  expect(estimateMessages(original)).toBeLessThan(2000);
});

it('recognizes context errors without treating unrelated failures as retryable', () => {
  expect(isContextWindowError({ errorText: 'context_length_exceeded' })).toBe(true);
  expect(isContextWindowError(new Error('prompt is too long'))).toBe(true);
  expect(isContextWindowError(new Error('The input token count (150000) exceeds the maximum number of tokens allowed (128000).'))).toBe(true);
  expect(isContextWindowError(new Error('rate limit exceeded'))).toBe(false);
});
