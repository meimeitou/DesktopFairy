'use strict';

const fs = require('fs');
const path = require('path');
const { dialog, net } = require('electron');
const catalog = require('./catalog.cjs');
const indexStore = require('./indexStore.cjs');
const ingest = require('./ingest.cjs');
const { searchKnowledge, readKnowledgeItem } = require('./search.cjs');
const { formatKnowledgeContext, hitsToCitations, isAllowedExt, uniqueCopyName, MAX_FILE_BYTES, MAX_BATCH_FILES, NOTE_CONTENT_MAX } = require('./lib.cjs');
const settingsSnapshot = require('../settingsSnapshot.cjs');
const { currentEmbeddingConfig } = require('./embed.cjs');

function requireEmbedding() {
  if (!currentEmbeddingConfig()) {
    throw new Error('未配置全局 embedding 模型，请到知识库页面左下角设置完成配置');
  }
}

function copyIntoRaw(baseId, srcPath, destName) {
  catalog.ensureDir(catalog.rawDir(baseId));
  const dest = path.join(catalog.rawDir(baseId), destName);
  fs.copyFileSync(srcPath, dest);
  return destName;
}

async function selectKnowledgeFiles() {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '知识库文件', extensions: ['txt', 'md', 'markdown', 'pdf', 'docx'] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return [];
  return result.filePaths.slice(0, MAX_BATCH_FILES).map((filePath) => {
    const name = path.basename(filePath);
    const stats = fs.statSync(filePath);
    return {
      path: filePath,
      name,
      size: stats.size,
      ext: path.extname(name).toLowerCase(),
      allowed: isAllowedExt(name) && stats.size <= MAX_FILE_BYTES,
      error: !isAllowedExt(name)
        ? '不支持的文件类型'
        : stats.size > MAX_FILE_BYTES
          ? '文件超过 100MB'
          : null,
    };
  });
}

function detectConflicts(base, files) {
  const existing = (base.items || []).filter((item) => item.type === 'file');
  return files.map((file) => {
    const clash = existing.find((item) => item.sourceName.toLowerCase() === file.name.toLowerCase());
    return {
      ...file,
      conflict: Boolean(clash),
      existingItemId: clash?.id || null,
    };
  });
}

function addPreparedFiles(baseId, decisions) {
  requireEmbedding();
  const base = catalog.getBase(baseId);
  if (!base) throw new Error('知识库不存在');
  const created = [];
  for (const decision of decisions || []) {
    if (!decision?.path) continue;
    if (decision.allowed === false) continue;
    if (decision.conflict && decision.action === 'replace' && decision.existingItemId) {
      indexStore.deleteItemChunks(baseId, decision.existingItemId);
      catalog.removeItem(baseId, decision.existingItemId);
    }
    const live = catalog.getBase(baseId);
    const names = catalog.listItemFileNames(live);
    let destName = decision.name;
    if (decision.conflict && decision.action !== 'replace') {
      destName = uniqueCopyName(names, decision.name);
    }
    copyIntoRaw(baseId, decision.path, destName);
    const now = Date.now();
    const item = {
      id: catalog.genId(),
      baseId,
      type: 'file',
      status: 'pending',
      sourceName: destName,
      relativePath: destName,
      createdAt: now,
      updatedAt: now,
    };
    catalog.upsertItem(baseId, item);
    ingest.enqueue(baseId, item.id);
    created.push(item);
  }
  return created;
}

function addNote(baseId, { title, content }) {
  requireEmbedding();
  const base = catalog.getBase(baseId);
  if (!base) throw new Error('知识库不存在');
  const text = String(content || '');
  if (text.length > NOTE_CONTENT_MAX) throw new Error('笔记超过 10 万字上限');
  const now = Date.now();
  const item = {
    id: catalog.genId(),
    baseId,
    type: 'note',
    status: 'pending',
    sourceName: String(title || '').trim() || '未命名笔记',
    noteContent: text,
    createdAt: now,
    updatedAt: now,
  };
  catalog.upsertItem(baseId, item);
  ingest.enqueue(baseId, item.id);
  return item;
}

function updateNote(baseId, itemId, { title, content }) {
  requireEmbedding();
  const item = catalog.getItem(baseId, itemId);
  if (!item || item.type !== 'note') throw new Error('笔记不存在');
  const text = String(content ?? item.noteContent ?? '');
  if (text.length > NOTE_CONTENT_MAX) throw new Error('笔记超过 10 万字上限');
  const next = {
    ...item,
    sourceName: typeof title === 'string' && title.trim() ? title.trim() : item.sourceName,
    noteContent: text,
    status: 'pending',
    error: undefined,
    updatedAt: Date.now(),
  };
  catalog.upsertItem(baseId, next);
  ingest.enqueue(baseId, itemId);
  return next;
}

async function testProcessor(processorId) {
  const settings = settingsSnapshot.getSnapshot() || {};
  const fp = settings.fileProcessing || {};
  if (processorId === 'open-mineru') {
    const host = String(fp.openMineru?.apiHost || 'http://127.0.0.1:8000').replace(/\/+$/, '');
    const res = await net.fetch(host, { method: 'GET' }).catch((e) => {
      throw new Error(`无法连接 Open MinerU：${e?.message || e}`);
    });
    return { ok: true, status: res.status, host };
  }
  const host = String(fp.mineru?.apiHost || 'https://mineru.net').replace(/\/+$/, '');
  const apiKey = fp.mineru?.apiKey || '';
  if (!apiKey) throw new Error('未填写 MinerU API Key');
  const res = await fetch(`${host}/api/v4/file-urls/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ files: [] }),
  });
  const text = await res.text();
  if (!res.ok && res.status !== 400) {
    throw new Error(`MinerU 连接失败 HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return { ok: true, status: res.status, host };
}

async function retrieveForChat({ query, baseIds }) {
  const hits = await searchKnowledge({ query, baseIds });
  return {
    hits,
    citations: hitsToCitations(hits),
    context: formatKnowledgeContext(hits),
  };
}

function registerKnowledgeHandlers(ipcMain) {
  ingest.failInterrupted();

  ipcMain.handle('knowledge:list_bases', async () => catalog.listBases());
  ipcMain.handle('knowledge:create_base', async (_e, payload) => catalog.createBase(payload || {}));
  ipcMain.handle('knowledge:update_base', async (_e, { baseId, patch }) => catalog.updateBase(baseId, patch || {}));
  ipcMain.handle('knowledge:delete_base', async (_e, { baseId }) => {
    indexStore.dropIndexFile(baseId);
    catalog.deleteBase(baseId);
    return { ok: true };
  });
  ipcMain.handle('knowledge:select_files', async (_e, { baseId } = {}) => {
    const files = await selectKnowledgeFiles();
    const base = baseId ? catalog.getBase(baseId) : null;
    return base ? detectConflicts(base, files) : files;
  });
  ipcMain.handle('knowledge:add_files', async (_e, { baseId, decisions }) => addPreparedFiles(baseId, decisions));
  ipcMain.handle('knowledge:add_note', async (_e, { baseId, title, content }) => addNote(baseId, { title, content }));
  ipcMain.handle('knowledge:update_note', async (_e, { baseId, itemId, title, content }) =>
    updateNote(baseId, itemId, { title, content }));
  ipcMain.handle('knowledge:delete_item', async (_e, { baseId, itemId }) => {
    indexStore.deleteItemChunks(baseId, itemId);
    catalog.removeItem(baseId, itemId);
    return { ok: true };
  });
  ipcMain.handle('knowledge:reindex_item', async (_e, { baseId, itemId }) => {
    requireEmbedding();
    ingest.requeueItem(baseId, itemId);
    return { ok: true };
  });
  ipcMain.handle('knowledge:rebuild_all', async () => {
    requireEmbedding();
    ingest.requeueAllBases();
    return { ok: true };
  });
  ipcMain.handle('knowledge:search', async (_e, payload) => searchKnowledge(payload || {}));
  ipcMain.handle('knowledge:read_item', async (_e, { baseId, itemId, maxChars }) =>
    readKnowledgeItem(baseId, itemId, maxChars));
  ipcMain.handle('knowledge:test_processor', async (_e, { processorId }) => testProcessor(processorId));
}

module.exports = {
  registerKnowledgeHandlers,
  retrieveForChat,
  searchKnowledge,
  readKnowledgeItem,
};
