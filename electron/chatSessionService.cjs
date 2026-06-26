const fs = require('fs');
const path = require('path');
const { readChatLog } = require('./chatSessionLog.cjs');

const CHAT_SESSION_VERSION = 2;
const INLINE_PREVIEW_MAX = 16 * 1024;
const STORAGE_PREVIEW_MAX = 4 * 1024;

const STALE_TOOL_STATUSES = new Set(['streaming', 'running', 'awaiting_approval']);

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
}) {
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

  ipcMain.handle('chat:topics:list', async () => {
    migrateLegacySessionIfNeeded();
    return readJsonOrEmpty(topicsIndexPath(), emptyTopicsStore);
  });

  ipcMain.handle('chat:topics:create', async (_event, { name }) => {
    migrateLegacySessionIfNeeded();
    const store = readJsonOrEmpty(topicsIndexPath(), emptyTopicsStore);
    const now = Date.now();
    const newTopic = {
      id: genId(),
      name: name || '',
      createdAt: now,
      updatedAt: now,
      orderKey: now,
    };
    store.topics.push(newTopic);
    store.activeId = newTopic.id;
    writeJson(topicsIndexPath(), store);
    return newTopic;
  });

  ipcMain.handle('chat:topics:delete', async (_event, topicId) => {
    const store = readJsonOrEmpty(topicsIndexPath(), emptyTopicsStore);
    const topicIndex = store.topics.findIndex((t) => t.id === topicId);
    if (topicIndex === -1) return { ok: false, error: 'Topic not found' };

    store.topics.splice(topicIndex, 1);

    try {
      const sessionFile = getSessionFilePath(topicId);
      if (fs.existsSync(sessionFile)) {
        fs.unlinkSync(sessionFile);
      }
    } catch (e) {
      console.warn('Failed to delete session file:', e);
    }

    let autoCreated = null;
    if (store.topics.length === 0) {
      const now = Date.now();
      const newTopic = {
        id: genId(),
        name: '新对话',
        createdAt: now,
        updatedAt: now,
        orderKey: now,
      };
      store.topics.push(newTopic);
      store.activeId = newTopic.id;
      autoCreated = newTopic;
    } else if (store.activeId === topicId) {
      store.activeId = store.topics[0].id;
    }

    writeJson(topicsIndexPath(), store);

    return { ok: true, activeId: store.activeId, autoCreated };
  });

  ipcMain.handle('chat:topics:rename', async (_event, { topicId, name }) => {
    const store = readJsonOrEmpty(topicsIndexPath(), emptyTopicsStore);
    const topic = store.topics.find((t) => t.id === topicId);
    if (!topic) return { ok: false, error: 'Topic not found' };

    topic.name = name;
    topic.updatedAt = Date.now();
    writeJson(topicsIndexPath(), store);
    return { ok: true };
  });

  ipcMain.handle('chat:topics:setActive', async (_event, topicId) => {
    const store = readJsonOrEmpty(topicsIndexPath(), emptyTopicsStore);
    store.activeId = topicId;
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
}

module.exports = {
  registerChatSessionHandlers,
  normalizeSession,
  processSessionForSave,
};
