'use strict';

const fs = require('fs');
const path = require('path');
const catalog = require('./catalog.cjs');
const indexStore = require('./indexStore.cjs');
const { extractItemText } = require('./processors.cjs');
const { embedTexts, currentEmbeddingConfig } = require('./embed.cjs');
const { splitMarkdownChunks, isSemiBase, isAllowedSemiExt, DEFAULT_SEMI_MAX_FILE_BYTES } = require('./lib.cjs');
const { scheduleAutoDescribe, currentDescriptionConfig } = require('./describe.cjs');
const settingsSnapshot = require('../settingsSnapshot.cjs');

const queue = [];
let running = false;
let pdfBusy = false;

function enqueue(baseId, itemId) {
  if (queue.some((job) => job.baseId === baseId && job.itemId === itemId)) return;
  queue.push({ baseId, itemId });
  void pump();
}

function enqueueAllPending() {
  for (const base of catalog.listBases()) {
    for (const item of base.items || []) {
      if (item.status === 'pending' || item.status === 'processing') {
        item.status = 'pending';
        item.error = undefined;
        catalog.upsertItem(base.id, item);
        enqueue(base.id, item.id);
      }
    }
  }
}

function failInterrupted() {
  for (const base of catalog.listBases()) {
    for (const item of base.items || []) {
      if (item.status === 'processing') {
        catalog.upsertItem(base.id, {
          ...item,
          status: 'failed',
          error: '索引中断，请重新处理',
          updatedAt: Date.now(),
        });
      }
    }
  }
}

async function pump() {
  if (running) return;
  running = true;
  while (queue.length) {
    const job = queue.shift();
    try {
      await processJob(job);
    } catch (e) {
      console.warn('[knowledge] ingest job failed', e);
    }
  }
  running = false;
}

async function processJob({ baseId, itemId }) {
  const base = catalog.getBase(baseId);
  const item = base?.items?.find((row) => row.id === itemId);
  if (!base || !item) return;
  if (item.status === 'completed') return;

  if (isSemiBase(base)) {
    return processSemiJob({ base, item });
  }

  const settings = settingsSnapshot.getSnapshot() || {};
  const knowledge = settings.knowledge || {};
  const embedding = currentEmbeddingConfig();
  if (!embedding) {
    catalog.upsertItem(baseId, {
      ...item,
      status: 'failed',
      error: '未配置全局 embedding 模型',
      updatedAt: Date.now(),
    });
    return;
  }

  catalog.upsertItem(baseId, {
    ...item,
    status: 'processing',
    error: undefined,
    updatedAt: Date.now(),
  });

  const ext = path.extname(item.sourceName || '').toLowerCase();
  const needsPdf = item.type === 'file' && ext === '.pdf';
  if (needsPdf) {
    while (pdfBusy) await new Promise((r) => setTimeout(r, 400));
    pdfBusy = true;
  }

  try {
    let absPath = null;
    if (item.type === 'file') {
      absPath = path.join(catalog.rawDir(baseId), item.relativePath);
      if (!fs.existsSync(absPath)) throw new Error('文件副本丢失');
    }
    const text = await extractItemText({
      item,
      absPath,
      fileProcessing: settings.fileProcessing,
    });
    if (item.type === 'file' && ext === '.pdf') {
      const indexedRelativePath = path.posix.join(
        path.posix.dirname(item.relativePath.replace(/\\/g, '/')),
        `${path.parse(item.sourceName).name}.md`,
      );
      const outAbs = path.join(catalog.rawDir(baseId), indexedRelativePath);
      catalog.ensureDir(path.dirname(outAbs));
      fs.writeFileSync(outAbs, text);
      item.indexedRelativePath = indexedRelativePath;
    }
    const chunks = splitMarkdownChunks(text, knowledge.chunkSize, knowledge.chunkOverlap);
    if (chunks.length === 0) throw new Error('没有可索引文本');
    const embeddings = await embedTexts(chunks, embedding);
    indexStore.replaceItemChunks(
      baseId,
      itemId,
      chunks.map((chunkText, chunkIndex) => ({
        chunkIndex,
        text: chunkText,
        embedding: embeddings[chunkIndex],
      })),
    );
    catalog.upsertItem(baseId, {
      ...item,
      status: 'completed',
      error: undefined,
      updatedAt: Date.now(),
    });
  } catch (e) {
    catalog.upsertItem(baseId, {
      ...item,
      status: 'failed',
      error: String(e?.message || e),
      updatedAt: Date.now(),
    });
  } finally {
    if (needsPdf) pdfBusy = false;
  }
}

async function processSemiJob({ base, item }) {
  const settings = settingsSnapshot.getSnapshot() || {};
  const knowledge = settings.knowledge || {};
  const maxBytes = Math.max(1024, Number(knowledge.semiMaxFileBytes) || DEFAULT_SEMI_MAX_FILE_BYTES);
  const baseId = base.id;
  try {
    if (item.type === 'note') {
      catalog.upsertItem(baseId, {
        ...item,
        status: 'completed',
        error: undefined,
        updatedAt: Date.now(),
      });
      if (!item.description && currentDescriptionConfig()) {
        scheduleAutoDescribe(baseId, item.id);
      }
      return;
    }
    if (item.type !== 'file') throw new Error('半结构化库仅支持文件或笔记');
    if (!isAllowedSemiExt(item.sourceName)) throw new Error('半结构化库不支持的文件类型');
    const absPath = path.join(catalog.rawDir(baseId), item.relativePath);
    if (!fs.existsSync(absPath)) throw new Error('文件副本丢失');
    const stat = fs.statSync(absPath);
    if (stat.size > maxBytes) {
      throw new Error(`文件超出上限 (${stat.size} > ${maxBytes} 字节)`);
    }
    catalog.upsertItem(baseId, {
      ...item,
      status: 'completed',
      error: undefined,
      updatedAt: Date.now(),
    });
    if (!item.description && currentDescriptionConfig()) {
      scheduleAutoDescribe(baseId, item.id);
    }
  } catch (e) {
    catalog.upsertItem(baseId, {
      ...item,
      status: 'failed',
      error: String(e?.message || e),
      updatedAt: Date.now(),
    });
  }
}

function requeueItem(baseId, itemId) {
  const item = catalog.getItem(baseId, itemId);
  if (!item) throw new Error('条目不存在');
  catalog.upsertItem(baseId, {
    ...item,
    status: 'pending',
    error: undefined,
    updatedAt: Date.now(),
  });
  enqueue(baseId, itemId);
}

function requeueAllBases() {
  for (const base of catalog.listBases()) {
    if (!isSemiBase(base)) {
      indexStore.dropIndexFile(base.id);
    }
    for (const item of base.items || []) {
      catalog.upsertItem(base.id, {
        ...item,
        status: 'pending',
        error: undefined,
        indexedRelativePath: item.type === 'file' ? undefined : item.indexedRelativePath,
        updatedAt: Date.now(),
      });
      enqueue(base.id, item.id);
    }
  }
}

module.exports = {
  enqueue,
  enqueueAllPending,
  failInterrupted,
  requeueItem,
  requeueAllBases,
};
