const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { MockLanguageModelV3 } = require('ai/test');
const provider = require('./providerModel.cjs');
const { createChunkBridge } = require('./chunkBridge.cjs');
const { registerChatSessionHandlers } = require('../chatSessionService.cjs');
const { AiStreamManager } = require('./streamManager/AiStreamManager.cjs');
const { broadcastToTopic } = require('./topicBroadcast.cjs');

const usage = { inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 30, text: 30, reasoning: 0 } };
const messages = [
  { role: 'user', content: '早期要求：不要删除用户文件' }, { role: 'assistant', content: '已完成的过往工作记录。'.repeat(100) },
  { role: 'user', content: '最近要求' }, { role: 'assistant', content: '进行中' }, { role: 'user', content: '继续' },
];

it('manual compaction uses a tool-free model call, bridges a durable checkpoint, and round-trips the actual disk IPC', async () => {
  const original = provider.resolveProviderModel;
  const entry = require.resolve('./AiService.cjs');
  const cached = require.cache[entry];
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'context-checkpoint-'));
  const model = new MockLanguageModelV3({ doGenerate: async () => ({
    content: [{ type: 'text', text: '目标：继续工作。约束：不要删除用户文件。' }],
    finishReason: { unified: 'stop', raw: 'stop' }, usage,
    warnings: [],
  }), doStream: async () => ({ stream: new ReadableStream({ start(controller) {
    controller.enqueue({ type: 'stream-start', warnings: [] });
    controller.enqueue({ type: 'text-start', id: 'reply' });
    controller.enqueue({ type: 'text-delta', id: 'reply', delta: 'continued task' });
    controller.enqueue({ type: 'text-end', id: 'reply' });
    controller.enqueue({ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage });
    controller.close();
  } }) }) });
  try {
    provider.resolveProviderModel = () => model;
    delete require.cache[entry];
    const { streamText } = require(entry);
    const result = await streamText({ compact: true, messages, apiConfig: { modelName: 'gpt-4o' },
      // Tool deps deliberately absent. A normal agent request would need them.
      toolDefinitions: [{ type: 'function', function: { name: 'dangerous', parameters: {} } }],
    });
    const events = [];
    const bridge = createChunkBridge({ requestId: 'r', safeSend: (channel, data) => events.push({ channel, data }) });
    for await (const chunk of result.stream) bridge.handleChunk(chunk);
    expect(model.doGenerateCalls).toHaveLength(1);
    expect(model.doGenerateCalls[0].tools).toBeUndefined();
    expect(JSON.stringify(model.doGenerateCalls[0].prompt)).toContain('早期要求');
    const checkpoint = events.find((e) => e.data.checkpoint).data.checkpoint;
    expect(checkpoint.messages.slice(1)).toEqual(messages.slice(2));
    expect(checkpoint.reason).toBe('manual');

    const handlers = {};
    registerChatSessionHandlers({ ipcMain: { handle: (channel, fn) => { handlers[channel] = fn; } },
      sessionPath: () => path.join(root, 'legacy.json'), topicsIndexPath: () => path.join(root, 'topics.json'),
      sessionsDir: () => path.join(root, 'sessions'), toolResultsDir: () => path.join(root, 'results'),
    });
    const marker = { id: `context:${checkpoint.id}`, role: 'user', type: 'clear', content: '', contextCheckpoint: checkpoint };
    expect((await handlers['chat:session:save']({}, { topicId: 't', session: { version: 2, messages: [marker] } })).ok).toBe(true);
    const restored = await handlers['chat:session:load']({}, 't');
    expect(restored.messages[0].contextCheckpoint).toEqual(checkpoint);
    const continuation = await streamText({ messages: [...checkpoint.messages, { role: 'user', content: 'execute next' }],
      apiConfig: { modelName: 'gpt-4o' }, systemPrompt: 'agent instructions', toolDefinitions: [], toolDeps: {}, maxTurns: 1 });
    for await (const chunk of continuation.stream) bridge.handleChunk(chunk);
    expect(model.doStreamCalls).toHaveLength(1);
    expect(model.doStreamCalls[0].maxOutputTokens).toBe(16384);
    expect(JSON.stringify(model.doStreamCalls[0].prompt)).toContain('execute next');
    expect(JSON.stringify(model.doStreamCalls[0].prompt)).toContain('不要删除用户文件');
    expect((await continuation.usagePromise).promptTokens).toBe(100);
  } finally {
    provider.resolveProviderModel = original;
    delete require.cache[entry];
    if (cached) require.cache[entry] = cached;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

it('replays an offline checkpoint once when a window attaches after compaction', () => {
  const manager = new AiStreamManager();
  const entry = { listeners: new Set(), buffer: [], status: 'streaming', requestId: 'r' };
  manager.activeStreams.set('t', entry);
  const checkpoint = { id: 'offline', reason: 'auto', summary: 'retained' };
  const bridge = createChunkBridge({ requestId: 'r', safeSend: (channel, data) => broadcastToTopic(manager, 't', null, channel, data) });
  bridge.handleChunk({ type: 'context-checkpoint', checkpoint });
  const window = { isDestroyed: () => false, mainFrame: { isDestroyed: () => false, send() {} } };
  const attached = manager.attach('t', window);
  expect(attached.legacyEvents).toEqual([{ channel: 'chat:stream:chunk', data: { requestId: 'r', checkpoint } }]);
  expect(manager.attach('t', window).legacyEvents).toEqual([]);
});
