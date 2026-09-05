'use strict';

/**
 * Classify remote catalog entries as chat / embedding / rerank / other.
 * API type fields win over id heuristics. Unknown → chat (conservative).
 */

const CHAT = 'chat';
const EMBEDDING = 'embedding';
const RERANK = 'rerank';
const OTHER = 'other';

function catalogId(entry) {
  if (typeof entry === 'string') return entry;
  if (!entry || typeof entry !== 'object') return '';
  return entry.id || entry.name || '';
}

function pushHint(hints, value) {
  if (typeof value === 'string' && value.trim()) hints.push(value);
}

function collectHints(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const hints = [];
  pushHint(hints, raw.type);
  pushHint(hints, raw.task);
  pushHint(hints, raw.object);
  pushHint(hints, raw.mode);
  if (raw.model_info && typeof raw.model_info === 'object') {
    pushHint(hints, raw.model_info.mode);
    pushHint(hints, raw.model_info.type);
  }
  if (raw.metadata && typeof raw.metadata === 'object') {
    pushHint(hints, raw.metadata.type);
    pushHint(hints, raw.metadata.task);
  }
  if (raw.architecture && typeof raw.architecture === 'object') {
    pushHint(hints, raw.architecture.modality);
    if (raw.architecture.embedding === true) hints.push('embedding');
  }
  if (Array.isArray(raw.capabilities)) {
    for (const cap of raw.capabilities) pushHint(hints, cap);
  } else {
    pushHint(hints, raw.capabilities);
  }
  return hints;
}

function kindFromHint(hint) {
  const s = String(hint).toLowerCase().trim();
  if (!s || s === 'model' || s === 'list') return null;
  if (s.includes('embed')) return EMBEDDING;
  if (s.includes('rerank')) return RERANK;
  if (
    s === 'image' ||
    s === 'audio' ||
    s === 'video' ||
    s === 'tts' ||
    s === 'asr' ||
    s === 'speech' ||
    s === 'moderation' ||
    s === 'realtime'
  ) {
    return OTHER;
  }
  if (
    s === 'chat' ||
    s === 'text' ||
    s === 'llm' ||
    s === 'completion' ||
    s === 'language'
  ) {
    return CHAT;
  }
  return null;
}

function kindFromApiFields(raw) {
  const hints = collectHints(raw);
  let sawChat = false;
  for (const hint of hints) {
    const kind = kindFromHint(hint);
    if (kind === EMBEDDING || kind === RERANK || kind === OTHER) return kind;
    if (kind === CHAT) sawChat = true;
  }
  return sawChat ? CHAT : null;
}

function kindFromId(id) {
  const s = String(id).toLowerCase();
  if (/(^|[-_./])(rerank|reranker)([-_.]|$)/.test(s) || s.includes('rerank')) {
    return RERANK;
  }
  if (/(^|[-_./])(embed|embedding|embeddings)([-_.]|$)/.test(s)) {
    return EMBEDDING;
  }
  if (/(^|[-_./])(tts|whisper|dall-e|dalle|sora)([-_.]|$)/.test(s)) {
    return OTHER;
  }
  if (/(^|[-_./])moderation([-_.]|$)/.test(s) || s.includes('gpt-image')) {
    return OTHER;
  }
  return CHAT;
}

function classifyModelKind(id, raw) {
  const fromApi = kindFromApiFields(raw && typeof raw === 'object' ? raw : null);
  if (fromApi) return fromApi;
  return kindFromId(id);
}

function classifyCatalog(list) {
  const out = [];
  const seen = new Set();
  const entries = Array.isArray(list) ? list : [];
  for (const entry of entries) {
    const id = String(catalogId(entry) || '').trim();
    if (!id || seen.has(id)) continue;
    const raw = typeof entry === 'string' ? null : entry;
    const kind = classifyModelKind(id, raw);
    if (kind === OTHER) continue;
    seen.add(id);
    out.push({ id, kind });
  }
  return out;
}

module.exports = {
  CHAT,
  EMBEDDING,
  RERANK,
  OTHER,
  classifyModelKind,
  classifyCatalog,
};
