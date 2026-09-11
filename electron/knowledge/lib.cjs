'use strict';

const DEFAULT_TOP_K = 5;
const DEFAULT_CHUNK_SIZE = 1024;
const DEFAULT_CHUNK_OVERLAP = 200;
const DEFAULT_SCORE_THRESHOLD = 0.5;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_BATCH_FILES = 20;
const NOTE_CONTENT_MAX = 100000;
const EMBED_BATCH = 10;
const PROCESSOR_TIMEOUT_MS = 10 * 60 * 1000;
const INDEX_SCHEMA_VERSION = 1;
const ALLOWED_EXTS = new Set(['.txt', '.md', '.markdown', '.pdf', '.docx']);
const SEMI_ALLOWED_EXTS = new Set(['.txt', '.md', '.markdown', '.json', '.yaml', '.yml']);
const DEFAULT_SEMI_MAX_FILE_BYTES = 64 * 1024;
const DEFAULT_SEMI_MAX_FILES_PER_QUERY = 3;
const SEMI_DESCRIPTION_MAX = 500;

function isAllowedExt(fileName) {
  const lower = String(fileName || '').toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot < 0) return false;
  return ALLOWED_EXTS.has(lower.slice(dot));
}

function isAllowedSemiExt(fileName) {
  const lower = String(fileName || '').toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot < 0) return false;
  return SEMI_ALLOWED_EXTS.has(lower.slice(dot));
}

function normalizeBaseKind(raw) {
  return raw === 'semi_structured' ? 'semi_structured' : 'vector';
}

function isSemiBase(base) {
  return base && normalizeBaseKind(base.kind) === 'semi_structured';
}

function normalizeDescription(raw) {
  const text = String(raw == null ? '' : raw).trim();
  if (!text) return '';
  if (text.length <= SEMI_DESCRIPTION_MAX) return text;
  return `${text.slice(0, SEMI_DESCRIPTION_MAX - 1)}…`;
}

function uniqueCopyName(existingNames, fileName) {
  const set = new Set((existingNames || []).map((n) => String(n).toLowerCase()));
  if (!set.has(fileName.toLowerCase())) return fileName;
  const dot = fileName.lastIndexOf('.');
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot) : '';
  for (let i = 2; i < 1000; i++) {
    const next = `${stem} (${i})${ext}`;
    if (!set.has(next.toLowerCase())) return next;
  }
  return `${stem} (${Date.now()})${ext}`;
}

function splitMarkdownBlocks(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let buf = [];
  let inFence = false;
  const flush = () => {
    const joined = buf.join('\n').trim();
    if (joined) blocks.push(joined);
    buf = [];
  };
  for (const line of lines) {
    if (/^```/.test(line)) {
      if (inFence) {
        buf.push(line);
        flush();
        inFence = false;
      } else {
        flush();
        buf.push(line);
        inFence = true;
      }
      continue;
    }
    if (inFence) {
      buf.push(line);
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      flush();
      buf.push(line);
      continue;
    }
    if (line.trim() === '') {
      flush();
      continue;
    }
    buf.push(line);
  }
  flush();
  return blocks;
}

function overlapTail(text, overlap) {
  if (overlap <= 0 || text.length <= overlap) return text.trim();
  return text.slice(-overlap).trim();
}

function hardSplit(text, size, overlap) {
  const out = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + size);
    out.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return out.filter(Boolean);
}

function splitMarkdownChunks(text, chunkSize, chunkOverlap) {
  const source = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!source) return [];
  const size = Math.max(32, chunkSize || DEFAULT_CHUNK_SIZE);
  const overlap = Math.max(0, Math.min(chunkOverlap ?? DEFAULT_CHUNK_OVERLAP, size - 1));
  const blocks = splitMarkdownBlocks(source);
  const packed = [];
  let current = '';
  for (const block of blocks) {
    if (!block.trim()) continue;
    if (block.length > size) {
      if (current.trim()) packed.push(current.trim());
      packed.push(...hardSplit(block, size, overlap));
      current = '';
      continue;
    }
    const next = current ? `${current}\n\n${block}` : block;
    if (next.length <= size) {
      current = next;
    } else {
      packed.push(current.trim());
      current = overlapTail(current, overlap);
      current = current ? `${current}\n\n${block}` : block;
      if (current.length > size) {
        packed.push(...hardSplit(current, size, overlap));
        current = '';
      }
    }
  }
  if (current.trim()) packed.push(current.trim());
  return packed.filter(Boolean);
}

function clampUnit(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function mergeHits(hits, topK) {
  const k = Math.max(1, topK || DEFAULT_TOP_K);
  return [...(hits || [])]
    .sort((a, b) => (b.score - a.score) || String(a.baseName).localeCompare(String(b.baseName)))
    .slice(0, k);
}

function filterHitsByThreshold(hits, threshold) {
  const min = clampUnit(threshold, DEFAULT_SCORE_THRESHOLD);
  return (hits || []).filter((hit) => Number.isFinite(hit.score) && hit.score >= min);
}

function formatKnowledgeContext(hits) {
  if (!hits || hits.length === 0) return '';
  const body = hits
    .map((hit, i) => `[${i + 1}] (${hit.baseName} / ${hit.sourceName})\n${hit.text}`)
    .join('\n\n');
  return `以下是从用户勾选的知识库中检索到的资料，请优先依据这些内容回答；若资料不足请明确说明。\n\n${body}`;
}

function hitsToCitations(hits) {
  return (hits || []).map((hit) => ({
    baseId: hit.baseId,
    baseName: hit.baseName,
    itemId: hit.itemId,
    sourceName: hit.sourceName,
    text: hit.text,
    kind: 'vector',
  }));
}

const IMAGE_PLACEHOLDER = '[图片]';

function replaceDocumentImages(markdown) {
  let text = String(markdown || '');
  text = text.replace(/!\[[^\]]*\]\(\s*data:image\/[a-zA-Z0-9.+-]+;base64,[^)]*\)/gi, IMAGE_PLACEHOLDER);
  text = text.replace(/<img\b[^>]*\bsrc=["']\s*data:image\/[^"']+["'][^>]*>/gi, IMAGE_PLACEHOLDER);
  text = text.replace(
    /!\[[^\]]*\]\(\s*(?!https?:\/\/|mailto:)[^)]+\.(?:png|jpe?g|gif|webp|bmp|svg|tiff?)(?:\s+"[^"]*")?\s*\)/gi,
    IMAGE_PLACEHOLDER,
  );
  text = text.replace(/<img\b[^>]*>/gi, IMAGE_PLACEHOLDER);
  text = text.replace(/!\[[^\]]*\]\(\s*(?:about:blank|#)?\s*\)/gi, IMAGE_PLACEHOLDER);
  text = text.replace(/(?:\[图片\][ \t]*){2,}/g, IMAGE_PLACEHOLDER);
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function float32ToBuffer(values) {
  return Buffer.from(new Float32Array(values).buffer);
}

function bufferToFloat32(buf) {
  const aligned = buf.byteOffset % 4 === 0 ? buf : Buffer.from(buf);
  return Array.from(new Float32Array(aligned.buffer, aligned.byteOffset, aligned.length / 4));
}

module.exports = {
  DEFAULT_TOP_K,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_SCORE_THRESHOLD,
  MAX_FILE_BYTES,
  MAX_BATCH_FILES,
  NOTE_CONTENT_MAX,
  EMBED_BATCH,
  PROCESSOR_TIMEOUT_MS,
  INDEX_SCHEMA_VERSION,
  ALLOWED_EXTS,
  SEMI_ALLOWED_EXTS,
  DEFAULT_SEMI_MAX_FILE_BYTES,
  DEFAULT_SEMI_MAX_FILES_PER_QUERY,
  SEMI_DESCRIPTION_MAX,
  isAllowedExt,
  isAllowedSemiExt,
  normalizeBaseKind,
  isSemiBase,
  normalizeDescription,
  uniqueCopyName,
  splitMarkdownChunks,
  mergeHits,
  filterHitsByThreshold,
  clampUnit,
  formatKnowledgeContext,
  hitsToCitations,
  replaceDocumentImages,
  IMAGE_PLACEHOLDER,
  cosineSimilarity,
  float32ToBuffer,
  bufferToFloat32,
};
