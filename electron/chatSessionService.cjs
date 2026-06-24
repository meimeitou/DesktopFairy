const fs = require('fs');
const path = require('path');

function emptySession() {
  return {
    version: 1,
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

function registerChatSessionHandlers({ ipcMain, sessionPath, topicsIndexPath, sessionsDir }) {
  function ensureDir(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (e) {
      console.warn('Failed to create directory:', dirPath, e);
    }
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
      ensureDir(path.dirname(filePath));
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
    return readJsonOrEmpty(filePath, emptySession);
  });

  ipcMain.handle('chat:session:save', async (_event, { topicId, session }) => {
    const filePath = getSessionFilePath(topicId);
    return writeJson(filePath, session);
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

module.exports = { registerChatSessionHandlers };
