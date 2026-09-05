'use strict';

const fs = require('fs');
const path = require('path');
const catalog = require('./catalog.cjs');
const indexStore = require('./indexStore.cjs');
const { embedTexts, currentEmbeddingConfig } = require('./embed.cjs');
const { mergeHits, clampUnit, DEFAULT_SCORE_THRESHOLD, replaceDocumentImages } = require('./lib.cjs');
const settingsSnapshot = require('../settingsSnapshot.cjs');

async function searchKnowledge({ query, baseIds, topK, scoreThreshold, includeBelowThreshold }) {
  const q = String(query || '').trim();
  if (!q) return [];
  const settings = settingsSnapshot.getSnapshot() || {};
  const knowledge = settings.knowledge || {};
  const k = Math.max(1, Number(topK) || knowledge.topK || 5);
  const threshold = clampUnit(
    scoreThreshold != null ? scoreThreshold : knowledge.scoreThreshold,
    DEFAULT_SCORE_THRESHOLD,
  );
  const minScore = includeBelowThreshold ? 0 : threshold;
  const embedding = currentEmbeddingConfig();
  if (!embedding) {
    throw new Error('未配置全局 embedding 模型，请到知识库页面左下角设置完成配置');
  }
  const ids = Array.isArray(baseIds) ? baseIds.filter(Boolean) : [];
  if (ids.length === 0) return [];
  const [queryVec] = await embedTexts([q], embedding);
  const allHits = [];
  for (const baseId of ids) {
    const base = catalog.getBase(baseId);
    if (!base) continue;
    const completed = new Set(
      (base.items || []).filter((item) => item.status === 'completed').map((item) => item.id),
    );
    if (completed.size === 0) continue;
    const rows = indexStore.queryIndex(baseId, queryVec, k, minScore);
    for (const row of rows) {
      if (!completed.has(row.itemId)) continue;
      const item = base.items.find((it) => it.id === row.itemId);
      if (!item) continue;
      allHits.push({
        baseId: base.id,
        baseName: base.name,
        itemId: item.id,
        itemType: item.type,
        sourceName: item.sourceName,
        chunkIndex: row.chunkIndex,
        text: row.text,
        score: row.score,
      });
    }
  }
  return mergeHits(allHits, k);
}

function readDiskFallback(item) {
  const tryPaths = [];
  if (item.indexedRelativePath) {
    tryPaths.push(path.join(catalog.rawDir(item.baseId), item.indexedRelativePath));
  }
  const ext = path.extname(item.sourceName || '').toLowerCase();
  if (item.relativePath && ['.txt', '.md', '.markdown'].includes(ext)) {
    tryPaths.push(path.join(catalog.rawDir(item.baseId), item.relativePath));
  }
  for (const abs of tryPaths) {
    try {
      if (fs.existsSync(abs)) {
        const text = fs.readFileSync(abs, 'utf8');
        if (text.trim()) return text;
      }
    } catch {
      /* ignore */
    }
  }
  return '';
}

function clipText(text, maxChars) {
  if (text.length <= maxChars) return { text, truncated: false };
  return { text: `${text.slice(0, maxChars)}\n\n…（已截断）`, truncated: true };
}

function readKnowledgeItem(baseId, itemId, maxChars = 12000) {
  const item = catalog.getItem(baseId, itemId);
  if (!item) throw new Error('条目不存在');
  const limit = Math.max(1000, Number(maxChars) || 12000);
  if (item.type === 'note' && item.noteContent) {
    return { item, ...clipText(item.noteContent, limit) };
  }
  const indexed = indexStore.readItemText(baseId, itemId);
  if (indexed) return { item, ...clipText(replaceDocumentImages(indexed), limit) };
  if (item.noteContent) return { item, ...clipText(item.noteContent, limit) };
  const disk = readDiskFallback(item);
  if (disk) return { item, ...clipText(replaceDocumentImages(disk), limit) };
  throw new Error('条目尚未完成索引，无法读取');
}

module.exports = {
  searchKnowledge,
  readKnowledgeItem,
};
