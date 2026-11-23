const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { MockLanguageModelV3 } = require('ai/test');
const provider = require('./providerModel.cjs');
const { createToolResultStore } = require('./toolResultStore.cjs');
const { mcpResultToTextSummary } = require('../mcpResultFormat.cjs');

it('two oversized MCP fetches stay bounded through the real agent loop and can find and read the original tail without rerunning tools', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-loop-budget-'));
  const resultStore = createToolResultStore({ topicId: 'terminal:tab-1', baseDir: () => root });
  const entry = require.resolve('./AiService.cjs');
  const cached = require.cache[entry];
  const originalResolve = provider.resolveProviderModel;
  let executions = 0;
  const content = 'START-EVIDENCE ' + 'x'.repeat(700000) + ' IMPORTANT-END-EVIDENCE';
  const usage = { inputTokens: { total: 2000, noCache: 2000, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 30, text: 30, reasoning: 0 } };
  const model = new MockLanguageModelV3({ doStream: async () => {
    const count = model.doStreamCalls.length;
    let parts;
    if (count <= 2) parts = [{ type: 'tool-call', toolCallId: `fetch-${count}`, toolName: 'mcp__server__fetch', input: '{}' }];
    else if (count <= 4) {
      const prompt = JSON.stringify(model.doStreamCalls.at(-1).prompt);
      const resultId = prompt.match(/context-[a-f0-9]{64}/)[0];
      parts = count === 3
        ? [{ type: 'tool-call', toolCallId: 'find-tail', toolName: 'search_tool_result', input: JSON.stringify({ resultId, query: 'IMPORTANT-END-EVIDENCE' }) }]
        : [{ type: 'tool-call', toolCallId: 'read-tail', toolName: 'read_tool_result', input: JSON.stringify({ resultId, offset: 699900 }) }];
    } else parts = [{ type: 'text-start', id: 'reply' }, { type: 'text-delta', id: 'reply', delta: '已依据原文完成回答。' }, { type: 'text-end', id: 'reply' }];
    return { stream: new ReadableStream({ start(controller) {
      controller.enqueue({ type: 'stream-start', warnings: [] });
      for (const part of parts) controller.enqueue(part);
      controller.enqueue({ type: 'finish', finishReason: { unified: count <= 4 ? 'tool-calls' : 'stop', raw: 'stop' }, usage });
      controller.close();
    } }) };
  } });
  try {
    provider.resolveProviderModel = () => model;
    delete require.cache[entry];
    const { streamText } = require(entry);
    const result = await streamText({
      messages: [{ role: 'user', content: '查阅两个网页，保留结尾证据。' }],
      apiConfig: { modelName: 'gateway-alias', contextWindow: 128000 },
      toolDefinitions: [{ type: 'function', function: { name: 'mcp__server__fetch', parameters: { type: 'object', properties: {} } } }],
      toolDeps: { topicId: 'terminal:tab-1', resultStore, bypassApproval: true,
        executeMcpTool: async () => { executions++; return JSON.stringify({ ok: true, content: mcpResultToTextSummary({ content: [{ type: 'text', text: content }] }) }); } },
    });
    const chunks = [];
    for await (const chunk of result.stream) chunks.push(chunk);
    expect(executions).toBe(2);
    expect(model.doStreamCalls).toHaveLength(5);
    expect(chunks.filter(c => c.type === 'context-checkpoint' || c.type === 'error')).toEqual([]);
    const lastPrompt = model.doStreamCalls.at(-1).prompt;
    for (const toolName of ['read_tool_result', 'search_tool_result']) {
      const result = lastPrompt.filter((m) => m.role === 'tool').flatMap((m) => m.content)
        .find((item) => item.toolName === toolName);
      expect(JSON.stringify(result)).toContain('IMPORTANT-END-EVIDENCE');
    }
    for (const call of model.doStreamCalls) expect(JSON.stringify(call.prompt).length).toBeLessThan(100000);
    expect(chunks.some(c => c.type === 'text-delta' && c.delta.includes('完成回答'))).toBe(true);
  } finally {
    provider.resolveProviderModel = originalResolve;
    delete require.cache[entry];
    if (cached) require.cache[entry] = cached;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
