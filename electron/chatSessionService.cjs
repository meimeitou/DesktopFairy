const fs = require('fs');
const path = require('path');
const { readChatLog } = require('./chatSessionLog.cjs');

const CHAT_SESSION_VERSION = 2;
const INLINE_PREVIEW_MAX = 16 * 1024;
const STORAGE_PREVIEW_MAX = 4 * 1024;

const STALE_TOOL_STATUSES = new Set(['streaming', 'running', 'awaiting_approval', 'awaiting_input']);

function ensureDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (e) {
    console.warn('Failed to create directory:', dirPath, e);
  }
}

function emptySession() {
  return {
    version: CHAT_SESSION_VERSION,
    updatedAt: Date.now(),
    messages: [],
    draftInput: '',
    draftAttachments: [],
  };
}

function emptyTopicsStore() {
  return {
    version: 1,
    activeId: null,
    topics: [],
  };
}

function genId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `topic-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeToolCallId(toolCallId) {
  return String(toolCallId || 'tool').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function normalizeToolMessage(m) {
  const tool = {
    id: m.id,
    role: m.role,
    content: typeof m.content === 'string' ? m.content : '',
    type: 'tool',
    error: m.error === true,
    timestamp: m.timestamp,
    toolName: typeof m.toolName === 'string' ? m.toolName : undefined,
    toolCallId: typeof m.toolCallId === 'string' ? m.toolCallId : undefined,
    toolArgs: typeof m.toolArgs === 'string' ? m.toolArgs : undefined,
    toolApprovalId: typeof m.toolApprovalId === 'string' ? m.toolApprovalId : undefined,
    toolStatus: m.toolStatus,
    toolMessage: typeof m.toolMessage === 'string' ? m.toolMessage : undefined,
    toolResultPreview: typeof m.toolResultPreview === 'string' ? m.toolResultPreview : undefined,
    toolResultRef: typeof m.toolResultRef === 'string' ? m.toolResultRef : undefined,
    toolResultBytes:
      typeof m.toolResultBytes === 'number' && Number.isFinite(m.toolResultBytes)
        ? m.toolResultBytes
        : undefined,
  };
  if (tool.toolStatus && STALE_TOOL_STATUSES.has(tool.toolStatus)) {
    tool.toolStatus = 'error';
    tool.toolMessage = tool.toolMessage || '会话恢复时工具未完成';
  }
  return tool;
}

function normalizeChatMessage(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw;
  if (
    typeof m.id !== 'string' ||
    (m.role !== 'user' && m.role !== 'assistant') ||
    typeof m.content !== 'string'
  ) {
    return null;
  }
  if (m.type === 'tool') return normalizeToolMessage(m);
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    type: m.type === 'clear' ? 'clear' : undefined,
    error: m.error === true,
    timestamp: m.timestamp,
    knowledgeCitations: Array.isArray(m.knowledgeCitations)
      ? m.knowledgeCitations
      : undefined,
  };
}

function normalizeSession(raw) {
  if (!raw || typeof raw !== 'object') return emptySession();
  const messages = Array.isArray(raw.messages)
    ? raw.messages.map(normalizeChatMessage).filter(Boolean)
    : [];
  return {
    version: raw.version === 1 || raw.version === CHAT_SESSION_VERSION ? raw.version : CHAT_SESSION_VERSION,
    updatedAt:
      typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt)
        ? raw.updatedAt
        : Date.now(),
    messages,
    draftInput: typeof raw.draftInput === 'string' ? raw.draftInput : '',
    draftAttachments: Array.isArray(raw.draftAttachments) ? raw.draftAttachments : [],
  };
}

function writeToolResultFile(toolResultsDir, topicId, toolCallId, payload) {
  const relRef = path.join(topicId, `${sanitizeToolCallId(toolCallId)}.json`);
  const absPath = path.join(toolResultsDir(), relRef);
  ensureDir(path.dirname(absPath));
  fs.writeFileSync(absPath, typeof payload === 'string' ? payload : JSON.stringify(payload));
  return relRef.split(path.sep).join('/');
}

function readToolResultFile(toolResultsDir, relRef) {
  const normalized = String(relRef || '').replace(/\\/g, '/');
  if (!normalized || normalized.includes('..')) return null;
  const absPath = path.join(toolResultsDir(), normalized);
  if (!fs.existsSync(absPath)) return null;
  return fs.readFileSync(absPath, 'utf8');
}

function processSessionForSave(session, topicId, toolResultsDir) {
  if (!session || !topicId || !toolResultsDir) return normalizeSession(session);
  const base = normalizeSession(session);
  const messages = base.messages.map((m) => {
    if (m.type !== 'tool' || !m.toolResultPreview) return m;
    const preview = m.toolResultPreview;
    const toolCallId = m.toolCallId || m.id;
    if (preview.length <= INLINE_PREVIEW_MAX && !m.toolResultRef) return m;

    let ref = m.toolResultRef;
    if (!ref) {
      ref = writeToolResultFile(toolResultsDir, topicId, toolCallId, preview);
    }

    const maxPreview = ref ? STORAGE_PREVIEW_MAX : INLINE_PREVIEW_MAX;
    const truncated =
      preview.length > maxPreview ? `${preview.slice(0, maxPreview)}…` : preview;

    return {
      ...m,
      toolResultRef: ref,
      toolResultBytes: m.toolResultBytes ?? preview.length,
      toolResultPreview: truncated,
    };
  });

  return {
    ...base,
    version: CHAT_SESSION_VERSION,
    messages,
    updatedAt: Date.now(),
  };
}

function registerChatSessionHandlers({
  ipcMain,
  sessionPath,
  topicsIndexPath,
  sessionsDir,
  toolResultsDir,
  chatLogsDir,
  getAbortHandler,
  getSshHosts,
}) {
  const PERSONAL_ASSISTANT_ID = 'personal-assistant';
  const HOST_ASSISTANT_ID = 'host-assistant';
  const CHAT_MODES = new Set(['normal', 'plan', 'auto-edit', 'full-auto']);

  /** Backfill agentId/chatMode on disk; returns store (mutated in place when changed). */
  function normalizeTopicsStore(store) {
    let changed = false;
    for (const topic of store.topics || []) {
      if (!topic || typeof topic !== 'object') continue;
      if (typeof topic.agentId !== 'string' || !topic.agentId.trim()) {
        topic.agentId = PERSONAL_ASSISTANT_ID;
        changed = true;
      }
      if (!CHAT_MODES.has(topic.chatMode)) {
        topic.chatMode = 'normal';
        changed = true;
      }
    }
    if (changed) writeJson(topicsIndexPath(), store);
    return store;
  }
  function ensureDirLocal(dirPath) {
    ensureDir(dirPath);
  }

  function readJsonOrEmpty(filePath, fallback) {
    try {
      if (!fs.existsSync(filePath)) return fallback();
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data && typeof data === 'object' ? data : fallback();
    } catch (e) {
      console.warn('Failed to read file:', filePath, e);
      return fallback();
    }
  }

  function writeJson(filePath, data) {
    try {
      ensureDirLocal(path.dirname(filePath));
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return { ok: true };
    } catch (e) {
      console.warn('Failed to write file:', filePath, e);
      return { ok: false };
    }
  }

  function getSessionFilePath(topicId) {
    if (!topicId) return sessionPath();
    return path.join(sessionsDir(), `${topicId}.json`);
  }

  /** Abort any live stream for a topic and drop its session/tool-result/log files. */
  function deleteTopicFiles(topicId) {
    try {
      const abort = getAbortHandler ? getAbortHandler(topicId) : null;
      if (abort) abort();
    } catch (e) {
      console.warn('Failed to abort stream for topic:', topicId, e);
    }
    try {
      const sessionFile = getSessionFilePath(topicId);
      if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
    } catch (e) {
      console.warn('Failed to delete session file:', topicId, e);
    }
    try {
      if (toolResultsDir) {
        const dir = path.join(toolResultsDir(), topicId);
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn('Failed to delete tool results:', topicId, e);
    }
    try {
      if (chatLogsDir) {
        const dir = path.join(chatLogsDir(), topicId);
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn('Failed to delete chat logs:', topicId, e);
    }
  }

  function migrateLegacySessionIfNeeded() {
    const oldPath = sessionPath();
    if (!fs.existsSync(oldPath)) return;

    const topics = readJsonOrEmpty(topicsIndexPath(), emptyTopicsStore);
    if (topics && topics.topics && topics.topics.length > 0) return;

    ensureDir(sessionsDir());
    const defaultId = 'default';
    const destPath = getSessionFilePath(defaultId);

    if (!fs.existsSync(destPath)) {
      try {
        fs.copyFileSync(oldPath, destPath);
      } catch (e) {
        console.warn('Failed to migrate legacy session:', e);
      }
    }

    const now = Date.now();
    const store = {
      version: 1,
      activeId: defaultId,
      topics: [{
        id: defaultId,
        name: '默认会话',
        createdAt: now,
        updatedAt: now,
        orderKey: now,
      }],
    };
    writeJson(topicsIndexPath(), store);
  }

  ipcMain.handle('chat:session:load', async (_event, topicId) => {
    const filePath = getSessionFilePath(topicId);
    const raw = readJsonOrEmpty(filePath, emptySession);
    return normalizeSession(raw);
  });

  ipcMain.handle('chat:session:save', async (_event, { topicId, session }) => {
    // topicId 会参与拼路径：只接受 genId 产生的形状（uuid / topic-<ts>-<rand>），
    // 避免索引读不出来时（下面的存活检查被跳过）被 `../` 穿越到任意 .json。
    if (typeof topicId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(topicId)) {
      return { ok: false, error: 'Invalid topicId' };
    }
    // 会话已被删除时不要再落盘：面板卸载/流结束的延迟保存会把
    // deleteTopicFiles 刚删掉的 session 文件重新写回来（孤儿文件）。
    // 注意只在索引「读得到且确实是缺这个 topic」时才拒绝——索引损坏时若也拒绝，
    // 之后所有会话都会静默写不进去（渲染层忽略返回值）。
    let store = null;
    try {
      store = JSON.parse(fs.readFileSync(topicsIndexPath(), 'utf8'));
    } catch (e) {
      if (e && e.code !== 'ENOENT') {
        console.warn('Topics index unreadable, skipping liveness check:', e.message);
      }
    }
    if (store && Array.isArray(store.topics)) {
      const alive = store.topics.some((t) => t && t.id === topicId);
      if (!alive) return { ok: false, error: 'Topic not found' };
    }
    const filePath = getSessionFilePath(topicId);
    const processed = processSessionForSave(session, topicId, toolResultsDir);
    return writeJson(filePath, processed);
  });

  ipcMain.handle('chat:tool-result:read', async (_event, { topicId, toolCallId, ref }) => {
    const relRef =
      ref ||
      path.join(topicId, `${sanitizeToolCallId(toolCallId)}.json`).split(path.sep).join('/');
    const text = readToolResultFile(toolResultsDir, relRef);
    return text;
  });

  ipcMain.handle('chat:log:load', async (_event, topicId) => {
    if (!chatLogsDir) return [];
    return readChatLog(chatLogsDir, topicId);
  });

  ipcMain.handle('chat:topics:list', async (_event, opts) => {
    migrateLegacySessionIfNeeded();
    let store = readJsonOrEmpty(topicsIndexPath(), emptyTopicsStore);
    store = normalizeTopicsStore(store);

    // Ensure there is always at least one non-host topic with a valid activeId.
    // Without it, renderer's `activeTopicId` stays `null` and the controlled input
    // will silently drop onChange updates (cursor blinks but cannot type).
    // Host topics must never be wiped by this fallback — only appended to.
    // Terminal-page topics also stay out: the chat page never lists them, so an
    // activeId pointing at one would leave the chat input without a topic.
    const nonHostTopics = (store.topics || []).filter(
      (t) => !t.host && t.origin !== 'terminal',
    );
    if (
      nonHostTopics.length === 0 ||
      !store.activeId ||
      !nonHostTopics.find((t) => t.id === store.activeId)
    ) {
      if (nonHostTopics.length > 0) {
        store.activeId = nonHostTopics[0].id;
      } else {
        const now = Date.now();
        const newTopic = {
          id: genId(),
          name: '',
          createdAt: now,
          updatedAt: now,
          orderKey: now,
          agentId: PERSONAL_ASSISTANT_ID,
          chatMode: 'normal',
        };
        store.topics = [...(store.topics || []), newTopic];
        store.activeId = newTopic.id;
      }
      writeJson(topicsIndexPath(), store);
    }

    const scope = opts && typeof opts === 'object' ? opts.scope : undefined;
    if (scope === 'host') {
      const hostTopics = store.topics.filter((t) => t && t.host);
      return {
        ...store,
        topics: hostTopics,
        activeId: null,
        activeHostId:
          typeof store.activeHostId === 'string' &&
          hostTopics.some((t) => t.id === store.activeHostId)
            ? store.activeHostId
            : (hostTopics[0]?.id ?? null),
      };
    }
    return store;
  });

  ipcMain.handle('chat:topics:create', async (_event, { name, agentId, chatMode, knowledgeBaseIds, hostId, origin }) => {
    migrateLegacySessionIfNeeded();
    const store = readJsonOrEmpty(topicsIndexPath(), emptyTopicsStore);
    const now = Date.now();
    const newTopic = {
      id: genId(),
      name: name || '',
      createdAt: now,
      updatedAt: now,
      orderKey: now,
      agentId:
        typeof agentId === 'string' && agentId.trim() ? agentId : PERSONAL_ASSISTANT_ID,
      chatMode: CHAT_MODES.has(chatMode) ? chatMode : 'normal',
      ...(Array.isArray(knowledgeBaseIds)
        ? { knowledgeBaseIds: knowledgeBaseIds.filter((id) => typeof id === 'string' && id) }
        : {}),
    };
    if (hostId !== undefined) {
      if (typeof hostId !== 'string' || !hostId.trim()) {
        return { ok: false, error: 'Invalid hostId' };
      }
      if (newTopic.agentId !== HOST_ASSISTANT_ID) {
        return { ok: false, error: 'Host topics must use host-assistant agent' };
      }
      const hostList = typeof getSshHosts === 'function' ? getSshHosts() : null;
      const host = hostList ? hostList.find((h) => h && h.id === hostId) : null;
      if (!host) {
        return { ok: false, error: 'Host not found' };
      }
      const fingerprint = hostFingerprint(host);
      newTopic.host = {
        hostId,
        grants: { [hostId]: fingerprint },
        cwdByHost: {},
      };
    }
    // 终端页「本机」分组创建的会话：只在终端侧栏列出，不进智能体列表。
    if (!newTopic.host && origin === 'terminal') {
      newTopic.origin = 'terminal';
    }
    store.topics.push(newTopic);
    if (newTopic.host) {
      store.activeHostId = newTopic.id;
    } else if (!newTopic.origin) {
      store.activeId = newTopic.id;
    }
    writeJson(topicsIndexPath(), store);
    return { ok: true, topic: newTopic };
  });


  ipcMain.handle('chat:topics:delete', async (_event, topicId) => {
    const store = readJsonOrEmpty(topicsIndexPath(), emptyTopicsStore);
    const topicIndex = store.topics.findIndex((t) => t.id === topicId);
    if (topicIndex === -1) return { ok: false, error: 'Topic not found' };

    const wasHostTopic = !!(store.topics[topicIndex] && store.topics[topicIndex].host);
    // 终端页会话（origin==='terminal'）同样不是聊天页会话：删它不该触发聊天页补建。
    const wasChatTopic =
      !wasHostTopic && store.topics[topicIndex].origin !== 'terminal';
    store.topics.splice(topicIndex, 1);

    // Host topics: abort the live stream first, then drop files (main-side cascade).
    deleteTopicFiles(topicId);

    let autoCreated = null;
    // 聊天页可见的会话 = 无 host 且非终端页创建的 topic；activeId 必须落在其中，
    // 否则渲染层拿到一个自己过滤掉的 id。
    const chatTopicOf = (list) =>
      list.find((t) => t && !t.host && t.origin !== 'terminal');
    if (wasChatTopic && !chatTopicOf(store.topics)) {
      const now = Date.now();
      const newTopic = {
        id: genId(),
        name: '新对话',
        createdAt: now,
        updatedAt: now,
        orderKey: now,
        agentId: PERSONAL_ASSISTANT_ID,
        chatMode: 'normal',
      };
      store.topics.push(newTopic);
      store.activeId = newTopic.id;
      autoCreated = newTopic;
    } else if (store.activeId === topicId) {
      store.activeId = chatTopicOf(store.topics)?.id ?? null;
    }
    if (store.activeHostId === topicId) {
      const nextHost = store.topics.find((t) => t.host);
      store.activeHostId = nextHost ? nextHost.id : null;
    }

    writeJson(topicsIndexPath(), store);

    return { ok: true, activeId: store.activeId, activeHostId: store.activeHostId, autoCreated };
  });

  ipcMain.handle('chat:topics:rename', async (_event, { topicId, name }) => {
    const store = readJsonOrEmpty(topicsIndexPath(), emptyTopicsStore);
    const topic = store.topics.find((t) => t.id === topicId);
    if (!topic) return { ok: false, error: 'Topic not found' };

    topic.name = name;
    topic.updatedAt = Date.now();
    writeJson(topicsIndexPath(), store);
  });

  ipcMain.handle('chat:topics:updateMeta', async (_event, { topicId, chatMode, knowledgeBaseIds }) => {
    const store = readJsonOrEmpty(topicsIndexPath(), emptyTopicsStore);
    const topic = store.topics.find((t) => t.id === topicId);
    if (!topic) return { ok: false, error: 'Topic not found' };
    // `host` state (grants/cwd) is intentionally NOT updatable from the renderer:
    // grant lifecycle is owned by main-side tool execution only.
    if (chatMode !== undefined) {
      if (!CHAT_MODES.has(chatMode)) {
        return { ok: false, error: 'Invalid chatMode' };
      }
      topic.chatMode = chatMode;
    }
    if (knowledgeBaseIds !== undefined) {
      topic.knowledgeBaseIds = Array.isArray(knowledgeBaseIds)
        ? knowledgeBaseIds.filter((id) => typeof id === 'string' && id)
        : [];
    }
    topic.updatedAt = Date.now();
    writeJson(topicsIndexPath(), store);
    return { ok: true, topic };
  });

  ipcMain.handle('chat:topics:setActive', async (_event, topicIdOrPayload) => {
    const store = readJsonOrEmpty(topicsIndexPath(), emptyTopicsStore);
    const payload =
      topicIdOrPayload && typeof topicIdOrPayload === 'object'
        ? topicIdOrPayload
        : { topicId: topicIdOrPayload, scope: 'chat' };
    const { topicId, scope } = payload;
    if (scope === 'host') {
      if (typeof topicId === 'string' && store.topics.some((t) => t.id === topicId && t.host)) {
        store.activeHostId = topicId;
      } else {
        store.activeHostId = null;
      }
    } else {
      store.activeId = typeof topicId === 'string' ? topicId : null;
    }
    writeJson(topicsIndexPath(), store);
    return { ok: true };
  });

  ipcMain.handle('chat:topics:updateOrder', async (_event, { topicIds }) => {
    const store = readJsonOrEmpty(topicsIndexPath(), emptyTopicsStore);
    const now = Date.now();
    topicIds.forEach((id, index) => {
      const topic = store.topics.find((t) => t.id === id);
      if (topic) {
        topic.orderKey = now - (topicIds.length - index);
      }
    });
    store.topics.sort((a, b) => b.orderKey - a.orderKey);
    writeJson(topicsIndexPath(), store);
    return { ok: true };
  });

  /** Host-state write surface for hostConversationService (single entry point). */
  const topicStore = {
    readStore() {
      return readJsonOrEmpty(topicsIndexPath(), emptyTopicsStore);
    },
    writeStore(store) {
      return writeJson(topicsIndexPath(), store);
    },
    getTopic(topicId) {
      const store = topicStore.readStore();
      return store.topics.find((t) => t.id === topicId) || null;
    },
    updateHostState(topicId, updater) {
      const store = topicStore.readStore();
      const topic = store.topics.find((t) => t.id === topicId);
      if (!topic || !topic.host) return false;
      const next = updater(topic.host);
      if (!next || typeof next !== 'object' || typeof next.hostId !== 'string') return false;
      topic.host = next;
      topic.updatedAt = Date.now();
      topicStore.writeStore(store);
      return true;
    },
    deleteTopicsByHost(hostId) {
      const store = topicStore.readStore();
      const targets = store.topics.filter((t) => t.host && t.host.hostId === hostId);
      if (targets.length === 0) return 0;
      for (const t of targets) {
        store.topics.splice(store.topics.findIndex((x) => x.id === t.id), 1);
        deleteTopicFiles(t.id);
      }
      if (store.activeHostId && !store.topics.find((t) => t.id === store.activeHostId && t.host)) {
        const nextHost = store.topics.find((t) => t.host);
        store.activeHostId = nextHost ? nextHost.id : null;
      }
      topicStore.writeStore(store);
      return targets.length;
    },
  };

  return topicStore;
}

function hostFingerprint(host) {
  const user = typeof host.user === 'string' ? host.user : '';
  const hostname = typeof host.host === 'string' ? host.host : '';
  const port = host.port || 22;
  const jump = typeof host.proxyJump === 'string' && host.proxyJump ? `?jump=${host.proxyJump}` : '';
  return `${user}@${hostname}:${port}${jump}`;
}

module.exports = {
  registerChatSessionHandlers,
  normalizeSession,
  processSessionForSave,
  hostFingerprint,
};

