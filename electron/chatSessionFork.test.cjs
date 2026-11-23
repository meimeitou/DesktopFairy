// vitest globals (globals: true) provide describe/it/expect in CJS tests
const fs = require('fs');
const os = require('os');
const path = require('path');
const { registerChatSessionHandlers } = require('./chatSessionService.cjs');

function makeHarness() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chatfork-test-'));
  const handlers = {};
  const ipc = { handle: (ch, fn) => { handlers[ch] = fn; } };
  registerChatSessionHandlers({
    ipcMain: ipc,
    sessionPath: () => path.join(tmp, 'session.json'),
    topicsIndexPath: () => path.join(tmp, 'topics.json'),
    sessionsDir: () => path.join(tmp, 'sessions'),
    toolResultsDir: () => path.join(tmp, 'toolresults'),
    chatLogsDir: () => path.join(tmp, 'logs'),
    getAbortHandler: () => null,
    getSshHosts: () => [{ id: 'h1', name: 'alpha', user: 'root', host: '1.2.3.4', port: 22 }],
  });
  return { tmp, handlers };
}

async function createTopic(h, overrides = {}) {
  const r = await h.handlers['chat:topics:create']({}, {
    name: '',
    agentId: 'personal-assistant',
    ...overrides,
  });
  expect(r.ok).toBe(true);
  return r.topic;
}

function readStore(h) {
  return JSON.parse(fs.readFileSync(path.join(h.tmp, 'topics.json'), 'utf8'));
}

describe('chat:topics:fork', () => {
  it('keeps transitive context resources readable after forking and deleting the source', async () => {
    const h = makeHarness();
    try {
      const { createToolResultStore } = require('./ai/toolResultStore.cjs');
      const source = await createTopic(h);
      const options = { baseDir: () => path.join(h.tmp, 'toolresults') };
      const sourceStore = createToolResultStore({ ...options, topicId: source.id });
      const pageId = await sourceStore.put('complete original page');
      const batchId = await sourceStore.put(JSON.stringify({ pageId }));
      const result = await h.handlers['chat:topics:fork']({}, { sourceTopicId: source.id, uptoMessageId: 'u1',
        messages: [{ id: 'u1', role: 'user', content: `继续读取 ${batchId}` }] });
      expect(result.ok).toBe(true);
      await h.handlers['chat:topics:delete']({}, source.id);
      const forkStore = createToolResultStore({ ...options, topicId: result.topic.id });
      expect((await forkStore.read(batchId)).content).toContain(pageId);
      expect((await forkStore.read(pageId)).content).toBe('complete original page');
    } finally { fs.rmSync(h.tmp, { recursive: true, force: true }); }
  });

  it('preserves an explicit knowledge-base deselection instead of re-inheriting agent defaults', async () => {
    const h = makeHarness();
    try {
      const src = await createTopic(h, { knowledgeBaseIds: [] });
      const result = await h.handlers['chat:topics:fork']({}, {
        sourceTopicId: src.id, uptoMessageId: 'u1',
        messages: [{ id: 'u1', role: 'user', content: 'hi' }],
      });
      expect(result.ok).toBe(true);
      expect(result.topic.knowledgeBaseIds).toEqual([]);
      expect(readStore(h).topics.find((topic) => topic.id === result.topic.id).knowledgeBaseIds).toEqual([]);
    } finally { fs.rmSync(h.tmp, { recursive: true, force: true }); }
  });

  it('forks messages, rewrites tool result refs, and leaves the source untouched', async () => {
    const h = makeHarness();
    const src = await createTopic(h, { name: '工作会话', chatMode: 'plan' });

    // 源工具结果文件
    const srcToolDir = path.join(h.tmp, 'toolresults', src.id);
    fs.mkdirSync(srcToolDir, { recursive: true });
    fs.writeFileSync(path.join(srcToolDir, 't1.json'), '{"out":"hello"}');

    // 给源落一份 session，fork 后断言未动
    await h.handlers['chat:session:save']({}, {
      topicId: src.id,
      session: {
        version: 2,
        updatedAt: 1,
        messages: [{ id: 'u1', role: 'user', content: 'hi' }],
        draftInput: '',
        draftAttachments: [],
      },
    });

    const messages = [
      { id: 'u1', role: 'user', content: 'hi' },
      { id: 'a1', role: 'assistant', content: 'hello!' },
      {
        id: 't1',
        role: 'assistant',
        content: '',
        type: 'tool',
        toolName: 'Bash',
        toolCallId: 'c1',
        toolStatus: 'done',
        toolResultPreview: '{"out":"hello"}',
        toolResultRef: `${src.id}/t1.json`,
      },
    ];
    const r = await h.handlers['chat:topics:fork']({}, {
      sourceTopicId: src.id,
      uptoMessageId: 't1',
      messages,
    });
    expect(r.ok).toBe(true);
    const topic = r.topic;
    expect(topic.id).not.toBe(src.id);
    expect(topic.name).toBe('工作会话（副本）');
    expect(topic.agentId).toBe('personal-assistant');
    expect(topic.chatMode).toBe('plan');

    const loaded = await h.handlers['chat:session:load']({}, topic.id);
    expect(loaded.messages).toHaveLength(3);
    expect(loaded.messages.map((m) => m.id)).toEqual(['u1', 'a1', 't1']);
    const toolMsg = loaded.messages[2];
    expect(toolMsg.toolResultRef).toBe(`${topic.id}/t1.json`);
    expect(
      fs.readFileSync(path.join(h.tmp, 'toolresults', topic.id, 't1.json'), 'utf8'),
    ).toBe('{"out":"hello"}');

    // 源 session 与源工具文件未动
    const srcSession = JSON.parse(
      fs.readFileSync(path.join(h.tmp, 'sessions', `${src.id}.json`), 'utf8'),
    );
    expect(srcSession.messages).toHaveLength(1);
    expect(
      fs.readFileSync(path.join(h.tmp, 'toolresults', src.id, 't1.json'), 'utf8'),
    ).toBe('{"out":"hello"}');

    // 非 host fork 激活新会话
    expect(readStore(h).activeId).toBe(topic.id);
  });

  it('empty source name forks to 副本', async () => {
    const h = makeHarness();
    const src = await createTopic(h, { name: '' });
    const r = await h.handlers['chat:topics:fork']({}, {
      sourceTopicId: src.id,
      uptoMessageId: 'a1',
      messages: [
        { id: 'u1', role: 'user', content: 'q' },
        { id: 'a1', role: 'assistant', content: 'a' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.topic.name).toBe('副本');
  });

  it('host topic fork inherits host state and updates activeHostId', async () => {
    const h = makeHarness();
    const src = await createTopic(h, { agentId: 'host-assistant', hostId: 'h1' });
    const r = await h.handlers['chat:topics:fork']({}, {
      sourceTopicId: src.id,
      uptoMessageId: 'a1',
      messages: [
        { id: 'u1', role: 'user', content: 'q' },
        { id: 'a1', role: 'assistant', content: 'a' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.topic.host).toEqual(src.host);
    expect(r.topic.host.hostId).toBe('h1');
    expect(readStore(h).activeHostId).toBe(r.topic.id);
  });

  it('unknown uptoMessageId fails without adding a topic', async () => {
    const h = makeHarness();
    const src = await createTopic(h);
    const before = readStore(h);
    const r = await h.handlers['chat:topics:fork']({}, {
      sourceTopicId: src.id,
      uptoMessageId: 'nope',
      messages: [{ id: 'u1', role: 'user', content: 'q' }],
    });
    expect(r).toEqual({ ok: false, error: 'Message not found' });
    expect(readStore(h).topics).toHaveLength(before.topics.length);
  });

  it('rejects path-traversal toolResultRef without copying', async () => {
    const h = makeHarness();
    const src = await createTopic(h, { name: '安全' });
    // 穿越尝试：ref 指向 toolresults 之外的路径
    const r = await h.handlers['chat:topics:fork']({}, {
      sourceTopicId: src.id,
      uptoMessageId: 't1',
      messages: [
        { id: 'u1', role: 'user', content: 'q' },
        {
          id: 't1',
          role: 'assistant',
          content: '',
          type: 'tool',
          toolName: 'Bash',
          toolCallId: 'c1',
          toolStatus: 'done',
          toolResultPreview: '{}',
          toolResultRef: `${src.id}/../evil.json`,
        },
      ],
    });
    expect(r.ok).toBe(true);
    const loaded = await h.handlers['chat:session:load']({}, r.topic.id);
    // ref 原样保留（不复制、不重写、不逃逸）
    expect(loaded.messages[1].toolResultRef).toBe(`${src.id}/../evil.json`);
    expect(fs.existsSync(path.join(h.tmp, 'evil.json'))).toBe(false);
  });

  it('stale tool status is persisted as done', async () => {
    const h = makeHarness();
    const src = await createTopic(h);
    const r = await h.handlers['chat:topics:fork']({}, {
      sourceTopicId: src.id,
      uptoMessageId: 't1',
      messages: [
        { id: 'u1', role: 'user', content: 'q' },
        {
          id: 't1',
          role: 'assistant',
          content: '',
          type: 'tool',
          toolName: 'Bash',
          toolCallId: 'c1',
          toolStatus: 'running',
        },
      ],
    });
    expect(r.ok).toBe(true);
    const loaded = await h.handlers['chat:session:load']({}, r.topic.id);
    expect(loaded.messages[1].toolStatus).toBe('done');
  });
});

it('retains structured web metadata on disk and restores an expanded result after forking', async () => {
  const h = makeHarness();
  try {
    const source = await createTopic(h);
    const { createToolResultStore } = require('./ai/toolResultStore.cjs');
    const storeOptions = { baseDir: () => path.join(h.tmp, 'toolresults') };
    const sourceStore = createToolResultStore({ ...storeOptions, topicId: source.id });
    const original = '正文'.repeat(10000);
    const pageId = await sourceStore.put(original);
    const resultId = await sourceStore.put(JSON.stringify({ pageId }));
    const payload = JSON.stringify({ ok: true, resultId, results: [
      { id: 1, url: 'https://example.test', title: 'Report', resultId: pageId, content: original },
    ] });
    const messages = [
      { id: 'u1', role: 'user', content: 'Read the report' },
      { id: 't1', role: 'assistant', content: '', type: 'tool', toolName: 'WebFetch', toolCallId: 'call-web', toolStatus: 'done', toolResultPreview: payload },
    ];
    expect((await h.handlers['chat:session:save']({}, { topicId: source.id, session: { messages } })).ok).toBe(true);
    const saved = await h.handlers['chat:session:load']({}, source.id);
    const result = saved.messages.at(-1);
    const preview = JSON.parse(result.toolResultPreview);
    expect(preview).toMatchObject({ resultId, truncated: true, results: [{ url: 'https://example.test', resultId: pageId }] });
    expect(await h.handlers['chat:tool-result:read']({}, { ref: result.toolResultRef })).toBe(payload);

    const fork = await h.handlers['chat:topics:fork']({}, {
      sourceTopicId: source.id, uptoMessageId: 't1', messages: saved.messages,
    });
    expect(fork.ok).toBe(true);
    await h.handlers['chat:topics:delete']({}, source.id);
    const forked = await h.handlers['chat:session:load']({}, fork.topic.id);
    expect(await h.handlers['chat:tool-result:read']({}, { ref: forked.messages.at(-1).toolResultRef })).toBe(payload);
    const forkStore = createToolResultStore({ ...storeOptions, topicId: fork.topic.id });
    expect((await forkStore.search(pageId, { query: '正文' })).passages.length).toBeGreaterThan(0);
  } finally {
    fs.rmSync(h.tmp, { recursive: true, force: true });
  }
});
