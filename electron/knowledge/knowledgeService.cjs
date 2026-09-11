'use strict';

const fs = require('fs');
const path = require('path');
const { dialog, net } = require('electron');
const catalog = require('./catalog.cjs');
const indexStore = require('./indexStore.cjs');
const ingest = require('./ingest.cjs');
const { searchKnowledge, readKnowledgeItem } = require('./search.cjs');
const {
  formatKnowledgeContext,
  hitsToCitations,
  isAllowedExt,
  isAllowedSemiExt,
  isSemiBase,
  normalizeBaseKind,
  uniqueCopyName,
  MAX_FILE_BYTES,
  MAX_BATCH_FILES,
  NOTE_CONTENT_MAX,
  DEFAULT_SEMI_MAX_FILE_BYTES,
} = require('./lib.cjs');
const settingsSnapshot = require('../settingsSnapshot.cjs');
const { currentEmbeddingConfig } = require('./embed.cjs');
const describe = require('./describe.cjs');

function requireEmbedding() {
  if (!currentEmbeddingConfig()) {
    throw new Error('未配置全局 embedding 模型，请到知识库页面左下角设置完成配置');
  }
}

function semiMaxBytes() {
  const s = settingsSnapshot.getSnapshot() || {};
  const n = Number(s.knowledge?.semiMaxFileBytes);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SEMI_MAX_FILE_BYTES;
}

function copyIntoRaw(baseId, srcPath, destName) {
  catalog.ensureDir(catalog.rawDir(baseId));
  const dest = path.join(catalog.rawDir(baseId), destName);
  fs.copyFileSync(srcPath, dest);
  return destName;
}

async function selectKnowledgeFiles(baseKind) {
  const semi = baseKind === 'semi_structured';
  const filters = semi
    ? [{ name: '半结构化文件', extensions: ['txt', 'md', 'markdown', 'json', 'yaml', 'yml'] }]
    : [{ name: '知识库文件', extensions: ['txt', 'md', 'markdown', 'pdf', 'docx'] }];
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters,
  });
  if (result.canceled || result.filePaths.length === 0) return [];
  const maxBytes = semi ? semiMaxBytes() : MAX_FILE_BYTES;
  const allowFn = semi ? isAllowedSemiExt : isAllowedExt;
  const sizeErr = semi
    ? `文件超过 ${(maxBytes / 1024).toFixed(0)}KB`
    : '文件超过 100MB';
  return result.filePaths.slice(0, MAX_BATCH_FILES).map((filePath) => {
    const name = path.basename(filePath);
    const stats = fs.statSync(filePath);
    return {
      path: filePath,
      name,
      size: stats.size,
      ext: path.extname(name).toLowerCase(),
      allowed: allowFn(name) && stats.size <= maxBytes,
      error: !allowFn(name)
        ? '不支持的文件类型'
        : stats.size > maxBytes
          ? sizeErr
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
  const base = catalog.getBase(baseId);
  if (!base) throw new Error('知识库不存在');
  const semi = isSemiBase(base);
  if (!semi) requireEmbedding();
  const maxBytes = semi ? semiMaxBytes() : MAX_FILE_BYTES;
  const allowFn = semi ? isAllowedSemiExt : isAllowedExt;
  const created = [];
  for (const decision of decisions || []) {
    if (!decision?.path) continue;
    if (decision.allowed === false) continue;
    if (!allowFn(decision.name)) continue;
    try {
      const stat = fs.statSync(decision.path);
      if (stat.size > maxBytes) continue;
    } catch { continue; }
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
  const base = catalog.getBase(baseId);
  if (!base) throw new Error('知识库不存在');
  if (isSemiBase(base)) throw new Error('半结构化知识库暂不支持添加笔记');
  requireEmbedding();
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
  const base = catalog.getBase(baseId);
  if (!base) throw new Error('知识库不存在');
  if (isSemiBase(base)) throw new Error('半结构化知识库暂不支持笔记');
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
  describe.failInterruptedDescriptions();

  ipcMain.handle('knowledge:list_bases', async () => catalog.listBases());
  ipcMain.handle('knowledge:create_base', async (_e, payload) => catalog.createBase({
    name: payload?.name,
    kind: normalizeBaseKind(payload?.kind),
  }));
  ipcMain.handle('knowledge:update_base', async (_e, { baseId, patch }) => catalog.updateBase(baseId, patch || {}));
  ipcMain.handle('knowledge:delete_base', async (_e, { baseId }) => {
    indexStore.dropIndexFile(baseId);
    catalog.deleteBase(baseId);
    return { ok: true };
  });
  ipcMain.handle('knowledge:select_files', async (_e, { baseId } = {}) => {
    const base = baseId ? catalog.getBase(baseId) : null;
    const files = await selectKnowledgeFiles(base?.kind);
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
    const base = catalog.getBase(baseId);
    if (!isSemiBase(base)) requireEmbedding();
    ingest.requeueItem(baseId, itemId);
    return { ok: true };
  });
  ipcMain.handle('knowledge:rebuild_all', async () => {
    // Only require embedding if any vector base exists.
    const anyVector = catalog.listBases().some((b) => !isSemiBase(b));
    if (anyVector) requireEmbedding();
    ingest.requeueAllBases();
    return { ok: true };
  });
  ipcMain.handle('knowledge:search', async (_e, payload) => searchKnowledge(payload || {}));
  ipcMain.handle('knowledge:read_item', async (_e, { baseId, itemId, maxChars }) =>
    readKnowledgeItem(baseId, itemId, maxChars));
  ipcMain.handle('knowledge:test_processor', async (_e, { processorId }) => testProcessor(processorId));

  ipcMain.handle('knowledge:describe_item', async (_e, { baseId, itemId, persist } = {}) => {
    const description = await describe.generateDescription({
      baseId,
      itemId,
      persist: persist !== false,
    });
    return { ok: true, description };
  });
  ipcMain.handle('knowledge:set_item_description', async (_e, { baseId, itemId, description }) => {
    const value = describe.setDescriptionManual(baseId, itemId, description);
    return { ok: true, description: value };
  });
}

module.exports = {
  registerKnowledgeHandlers,
  retrieveForChat,
  searchKnowledge,
  readKnowledgeItem,
};
