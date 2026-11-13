const { ToolLoopAgent, stepCountIs, tool } = require('ai');
const { MockLanguageModelV3 } = require('ai/test');
const { z } = require('zod');
const { createSteerableStream } = require('./steerableStream.cjs');
const { AgentInputQueue } = require('./AgentInputQueue.cjs');

const usage = { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 3, text: 3, reasoning: 0 } };
function modelStream(parts) {
  return { stream: new ReadableStream({ start(c) {
    c.enqueue({ type: 'stream-start', warnings: [] });
    for (const part of parts) c.enqueue(part);
    c.close();
  } }) };
}
function finish(reason = 'stop') { return { type: 'finish', finishReason: { unified: reason, raw: reason }, usage }; }
function text(value) { return [ { type: 'text-start', id: 'same-id' }, { type: 'text-delta', id: 'same-id', delta: value }, { type: 'text-end', id: 'same-id' }, finish() ]; }
function add(q, id) { q.enqueue('t', { message: { id, content: id }, apiMessage: { role: 'user', content: id } }); }
function run(model, { queue = new AgentInputQueue(), maxTurns = 5, tools = {}, controller = new AbortController(), compactor } = {}) {
  let sealed = false;
  const result = createSteerableStream({
    messages: [{ role: 'user', content: 'original' }], maxTurns, signal: controller.signal, compactor,
    inputs: {
      consume() { const rows = queue.consume('t', 'r'); return { messages: rows.map((r) => r.apiMessage), items: rows.map((r) => r.message) }; },
      hasPending: () => queue.pending('t').length > 0,
      seal() { sealed = true; },
    },
    createAgent: ({ remainingTurns, prepareStep, onStepFinish }) => new ToolLoopAgent({ model, tools, stopWhen: stepCountIs(remainingTurns), prepareStep, onStepFinish }),
  });
  return { ...result, sealed: () => sealed };
}
async function drain(result) {
  const chunks = [];
  for await (const chunk of result.stream) chunks.push(chunk);
  return chunks;
}
it('injects all inputs after tools, preserves them across subsequent steps, and maintains tool pairs', async () => {
  const queue = new AgentInputQueue();
  let executions = 0;
  const model = new MockLanguageModelV3({ doStream: async () => {
    const index = model.doStreamCalls.length;
    if (index < 3) return modelStream([
      { type: 'tool-call', toolCallId: `call-${index}`, toolName: 'work', input: '{}' }, finish('tool-calls'),
    ]);
    return modelStream(text('finished'));
  } });
  const result = run(model, { queue, tools: { work: tool({ inputSchema: z.object({}), execute: async () => {
    executions++;
    if (executions === 1) { add(queue, 'one'); add(queue, 'two'); }
    return 'done';
  } }) } });
  const chunks = await drain(result);
  expect(executions).toBe(2);
  const second = model.doStreamCalls[1].prompt;
  expect(second.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'user', 'user']);
  expect(JSON.stringify(second)).toContain('one');
  expect(JSON.stringify(model.doStreamCalls[2].prompt)).toContain('one');
  expect(JSON.stringify(model.doStreamCalls[2].prompt).match(/call-1/g)).toHaveLength(2);
  const injectionIndex = chunks.findIndex((c) => c.type === 'agent-input');
  expect(chunks[injectionIndex].items.map((m) => m.id)).toEqual(['one', 'two']);
  expect(chunks.slice(0, injectionIndex).some((c) => c.type === 'tool-output-available')).toBe(true);
  expect(chunks.filter((c) => c.type === 'finish')).toHaveLength(1);
  expect(await result.usagePromise).toEqual({ promptTokens: 30, completionTokens: 9 });
});

it('auto compacts after a large tool result, emits checkpoint after the result, then continues the same task', async () => {
  const { createContextCompactor } = require('./contextCompaction.cjs');
  let executions = 0;
  const compactor = createContextCompactor({ apiConfig: { modelName: 'gpt-3.5-turbo' },
    generateSummary: async () => ({ text: '已执行 work，结果存于 /tmp/result。下一步验证。' }) });
  const model = new MockLanguageModelV3({ doStream: async () => modelStream(model.doStreamCalls.length === 1 ? [
    { type: 'tool-call', toolCallId: 'large', toolName: 'work', input: '{}' }, finish('tool-calls'),
  ] : text('continued')) });
  const result = run(model, { compactor, tools: { work: tool({ inputSchema: z.object({}), execute: async () => { executions++; return 'x'.repeat(100000); } }) } });
  const chunks = await drain(result);
  const checkpointIndex = chunks.findIndex((c) => c.type === 'context-checkpoint');
  expect(checkpointIndex).toBeGreaterThan(chunks.findIndex((c) => c.type === 'tool-output-available'));
  expect(chunks.slice(checkpointIndex + 1).some((c) => c.type === 'text-delta')).toBe(true);
  expect(JSON.stringify(model.doStreamCalls[1].prompt)).toContain('已执行 work');
  expect(JSON.stringify(model.doStreamCalls[1].prompt)).toContain('original');
  expect(executions).toBe(1);
});

it('retries only the rejected model step once, retaining completed tool results', async () => {
  let executions = 0, recoveries = 0;
  const compactor = {
    prepare: async () => null, recordUsage() {},
    compact: async (messages, reason) => { recoveries++; expect(reason).toBe('overflow'); return { messages: [...messages], checkpoint: { id: 'recovery' } }; },
  };
  const model = new MockLanguageModelV3({ doStream: async () => {
    if (model.doStreamCalls.length === 1) return modelStream([
      { type: 'tool-call', toolCallId: 'side-effect', toolName: 'work', input: '{}' }, finish('tool-calls'),
    ]);
    if (model.doStreamCalls.length === 2) throw new Error('maximum context length exceeded');
    return modelStream(text('recovered'));
  } });
  const chunks = await drain(run(model, { compactor, tools: { work: tool({ inputSchema: z.object({}), execute: async () => { executions++; return 'already written'; } }) } }));
  expect(executions).toBe(1);
  expect(recoveries).toBe(1);
  expect(model.doStreamCalls).toHaveLength(3);
  expect(JSON.stringify(model.doStreamCalls[2].prompt)).toContain('already written');
  expect(chunks.some((c) => c.type === 'error')).toBe(false);
  expect(chunks.filter((c) => c.type === 'finish')).toHaveLength(1);
});

it('reports a second overflow and never loops indefinitely', async () => {
  let recoveries = 0;
  const compactor = { prepare: async () => null, recordUsage() {}, compact: async (messages) => {
    recoveries++; return { messages, checkpoint: { id: 'once' } };
  } };
  const model = new MockLanguageModelV3({ doStream: async () => { throw new Error('context_length_exceeded'); } });
  const chunks = await drain(run(model, { compactor }));
  expect(recoveries).toBe(1);
  expect(model.doStreamCalls).toHaveLength(2);
  expect(chunks.filter((c) => c.type === 'error')).toHaveLength(1);
});

it('does not retry a partially generated response even when the error mentions context', async () => {
  let recoveries = 0;
  const compactor = { prepare: async () => null, recordUsage() {}, compact: async () => { recoveries++; } };
  const model = new MockLanguageModelV3({ doStream: async () => modelStream([
    { type: 'text-start', id: 'partial' }, { type: 'text-delta', id: 'partial', delta: 'already visible' },
    { type: 'error', error: new Error('context_length_exceeded') },
  ]) });
  const chunks = await drain(run(model, { compactor }));
  expect(recoveries).toBe(0);
  expect(model.doStreamCalls).toHaveLength(1);
  expect(chunks.some((c) => c.type === 'text-delta')).toBe(true);
  expect(chunks.some((c) => c.type === 'error')).toBe(true);
});
it('continues a natural final answer with pending inputs using the remaining budget and unique text ids', async () => {
  const queue = new AgentInputQueue();
  const model = new MockLanguageModelV3({ doStream: async () => {
    if (model.doStreamCalls.length === 1) add(queue, 'followup');
    return modelStream(text(`answer-${model.doStreamCalls.length}`));
  } });
  const result = run(model, { queue, maxTurns: 2 });
  const chunks = await drain(result);
  expect(model.doStreamCalls).toHaveLength(2);
  expect(JSON.stringify(model.doStreamCalls[1].prompt)).toContain('answer-1');
  expect(JSON.stringify(model.doStreamCalls[1].prompt)).toContain('followup');
  expect(chunks.filter((c) => c.type === 'text-delta').map((c) => c.id)).toEqual(['0:same-id', '1:same-id']);
  expect(chunks.filter((c) => c.type === 'finish')).toHaveLength(1);
  expect(result.sealed()).toBe(true);
});
it('does not reset the step budget for additional inputs', async () => {
  const queue = new AgentInputQueue();
  const model = new MockLanguageModelV3({ doStream: async () => {
    add(queue, `extra-${model.doStreamCalls.length}`);
    return modelStream(text('answer'));
  } });
  const result = run(model, { queue, maxTurns: 2 });
  const chunks = await drain(result);
  expect(model.doStreamCalls).toHaveLength(2);
  expect(queue.pending('t').map((r) => r.message.id)).toEqual(['extra-2']);
  expect(chunks.at(-1).finishReason).toBe('tool-calls');
});
it('leaves pending input untouched after an error', async () => {
  const queue = new AgentInputQueue();
  const model = new MockLanguageModelV3({ doStream: async () => {
    add(queue, 'pending');
    return modelStream([{ type: 'error', error: new Error('offline') }]);
  } });
  const result = run(model, { queue });
  const chunks = await drain(result);
  expect(chunks.some((c) => c.type === 'error')).toBe(true);
  expect(queue.pending('t')).toHaveLength(1);
  expect(model.doStreamCalls).toHaveLength(1);
});
it('queues while a tool waits for interaction without releasing or bypassing the wait', async () => {
  const queue = new AgentInputQueue();
  let entered;
  const started = new Promise((resolve) => { entered = resolve; });
  let release;
  const interaction = new Promise((resolve) => { release = resolve; });
  const model = new MockLanguageModelV3({ doStream: async () => modelStream(model.doStreamCalls.length === 1 ? [
    { type: 'tool-call', toolCallId: 'wait', toolName: 'wait', input: '{}' }, finish('tool-calls'),
  ] : text('answered')) });
  const result = run(model, { queue, tools: { wait: tool({ inputSchema: z.object({}), execute: async () => {
    entered();
    await interaction;
    return 'user approved';
  } }) } });
  const draining = drain(result);
  await started;
  add(queue, 'while-waiting');
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(queue.pending('t')).toHaveLength(1);
  expect(model.doStreamCalls).toHaveLength(1);
  release();
  await draining;
  expect(JSON.stringify(model.doStreamCalls[1].prompt)).toContain('while-waiting');
});
it('stop during a running tool retains pending inputs and never starts another model call', async () => {
  const queue = new AgentInputQueue();
  const controller = new AbortController();
  const model = new MockLanguageModelV3({ doStream: async () => modelStream([
    { type: 'tool-call', toolCallId: 'wait', toolName: 'wait', input: '{}' }, finish('tool-calls'),
  ]) });
  const result = run(model, { queue, controller, tools: { wait: tool({ inputSchema: z.object({}), execute: async () => {
    add(queue, 'keep');
    controller.abort();
    return 'stopped';
  } }) } });
  await expect(drain(result)).rejects.toMatchObject({ name: 'AbortError' });
  expect(model.doStreamCalls).toHaveLength(1);
  expect(queue.pending('t').map((r) => r.message.id)).toEqual(['keep']);
  expect(result.sealed()).toBe(true);
});
