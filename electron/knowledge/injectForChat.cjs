'use strict';

const catalog = require('./catalog.cjs');
const { isSemiBase, formatKnowledgeContext, hitsToCitations } = require('./lib.cjs');
const { searchKnowledge } = require('./search.cjs');
const {
  selectSemiStructuredFiles,
  formatSemiContext,
  semiFilesToCitations,
} = require('./semiSelect.cjs');

function pickLatestUserQuery(messages) {
  if (!Array.isArray(messages)) return '';
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== 'user') continue;
    if (typeof m.content === 'string') return m.content;
    if (Array.isArray(m.content)) {
      const text = m.content
        .filter((p) => p && p.type === 'text' && typeof p.text === 'string')
        .map((p) => p.text)
        .join('\n');
      if (text.trim()) return text;
    }
  }
  return '';
}

function partitionBaseIdsByKind(baseIds) {
  const vector = [];
  const semi = [];
  for (const id of baseIds || []) {
    const base = catalog.getBase(id);
    if (!base) continue;
    if (isSemiBase(base)) semi.push(id);
    else vector.push(id);
  }
  return { vector, semi };
}

/**
 * Build knowledge injection payload for chat/agent send paths.
 *
 * @returns {Promise<{ systemMessage: string|null, citations: Array, files: Array }>}
 */
async function buildKnowledgeInjection({ messages, knowledgeBaseIds, apiConfig, signal } = {}) {
  const ids = Array.isArray(knowledgeBaseIds)
    ? knowledgeBaseIds.filter((id) => typeof id === 'string' && id)
    : [];
  if (ids.length === 0) return { systemMessage: null, citations: [], files: [], errors: [] };
  const query = pickLatestUserQuery(messages);
  if (!query.trim()) return { systemMessage: null, citations: [], files: [], errors: [] };

  const { vector, semi } = partitionBaseIdsByKind(ids);
  const parts = [];
  const citations = [];
  const files = [];
  /** @type {Array<{kind:'vector'|'semi_structured', message:string}>} */
  const errors = [];

  if (vector.length > 0) {
    try {
      const hits = await searchKnowledge({ query, baseIds: vector, signal });
      const ctx = formatKnowledgeContext(hits);
      if (ctx) parts.push(ctx);
      citations.push(...hitsToCitations(hits));
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
      const message = String(e?.message || e);
      console.warn('[knowledge] vector pre-retrieve failed:', message);
      errors.push({ kind: 'vector', message });
    }
  }
  if (semi.length > 0) {
    try {
      const picked = await selectSemiStructuredFiles({
        query,
        baseIds: semi,
        apiConfig,
        signal,
      });
      const ctx = formatSemiContext(picked);
      if (ctx) parts.push(ctx);
      citations.push(...semiFilesToCitations(picked));
      files.push(...picked);
    } catch (e) {
      if (e?.name === 'AbortError') throw e;
      const message = String(e?.message || e);
      console.warn('[knowledge] semi pre-select failed:', message);
      errors.push({ kind: 'semi_structured', message });
    }
  }

  const systemMessage = parts.length > 0 ? parts.join('\n\n---\n\n') : null;
  return { systemMessage, citations, files, errors };
}

module.exports = { buildKnowledgeInjection };
