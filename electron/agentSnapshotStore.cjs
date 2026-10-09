/**
 * Process-level file snapshot store for hashline edit anchors.
 * Mirrors pi's packages/hashline/src/snapshots.ts semantics:
 * - 256 paths max (FIFO eviction), 4 versions per path (oldest dropped)
 * - files > 4 MiB are not recorded
 * - tag = first 4 uppercase hex chars of sha256(normalized content);
 *   collisions within a path's version chain take later 4-hex windows.
 */
const crypto = require('crypto');

const MAX_PATHS = 256;
const MAX_VERSIONS_PER_PATH = 4;
const SNAPSHOT_MAX_BYTES = 4 * 1024 * 1024;

/** @type {Map<string, { versions: Array<{tag:string,content:string,seenRanges:Array<[number,number]>}>, touch:number}>} */
const store = new Map();

function normalizeContent(content) {
  return String(content).replace(/\r\n/g, '\n');
}

function digestWindows(content) {
  const normalized = normalizeContent(content);
  const hex = crypto.createHash('sha256').update(normalized, 'utf8').digest('hex').toUpperCase();
  const windows = [];
  for (let i = 0; i + 4 <= hex.length; i += 4) windows.push(hex.slice(i, i + 4));
  return windows;
}

/** Merge/insert a 1-indexed inclusive range into a sorted list. */
function mergeRange(ranges, start, end) {
  const out = [];
  let placed = false;
  for (const [s, e] of ranges) {
    if (e + 1 < start || s - 1 > end) {
      out.push([s, e]);
      continue;
    }
    // overlapping or adjacent
    if (!placed) {
      out.push([Math.min(s, start), Math.max(e, end)]);
      placed = true;
    } else {
      const last = out[out.length - 1];
      last[0] = Math.min(last[0], s);
      last[1] = Math.max(last[1], e);
    }
  }
  if (!placed) out.push([start, end]);
  out.sort((a, b) => a[0] - b[0]);
  return out;
}

function touchEntry(absPath) {
  let entry = store.get(absPath);
  if (!entry) {
    if (store.size >= MAX_PATHS) {
      // evict least-recently-touched
      let oldest = null;
      for (const [p, e] of store) {
        if (oldest === null || e.touch < store.get(oldest).touch) oldest = p;
      }
      if (oldest !== null) store.delete(oldest);
    }
    entry = { versions: [], touch: 0 };
    store.set(absPath, entry);
  }
  entry.touch = Date.now();
  return entry;
}

/**
 * Record a snapshot; reuses an existing version with identical content.
 * Returns the tag, or null when the file exceeds the byte cap.
 */
function recordSnapshot(absPath, content, seenRanges = []) {
  const text = normalizeContent(String(content));
  if (Buffer.byteLength(text, 'utf8') > SNAPSHOT_MAX_BYTES) return null;
  const entry = touchEntry(absPath);
  const ranges = (Array.isArray(seenRanges) ? seenRanges : [])
    .filter((r) => Array.isArray(r) && Number.isFinite(r[0]) && Number.isFinite(r[1]))
    .map((r) => [Math.max(1, Math.round(r[0])), Math.round(r[1])])
    .sort((a, b) => a[0] - b[0]);

  for (const v of entry.versions) {
    if (v.content === text) {
      for (const r of ranges) v.seenRanges = mergeRange(v.seenRanges, r[0], r[1]);
      return v.tag;
    }
  }

  const windows = digestWindows(text);
  const taken = new Set(entry.versions.map((v) => v.tag));
  let tag = windows[0];
  for (const w of windows) {
    if (!taken.has(w)) { tag = w; break; }
  }
  if (!tag) {
    // degenerate fallback: any unused 4-hex
    for (let i = 0; i < 0x10000; i++) {
      const cand = i.toString(16).toUpperCase().padStart(4, '0');
      if (!taken.has(cand)) { tag = cand; break; }
    }
  }
  entry.versions.push({ tag, content: text, seenRanges: ranges });
  while (entry.versions.length > MAX_VERSIONS_PER_PATH) entry.versions.shift();
  return tag;
}

/** Get a specific version by tag; null when absent. */
function getSnapshot(absPath, tag) {
  const entry = store.get(absPath);
  if (!entry) return null;
  return entry.versions.find((v) => v.tag === String(tag || '').toUpperCase()) || null;
}

/** Latest recorded version for a path; null when absent. */
function latestSnapshot(absPath) {
  const entry = store.get(absPath);
  if (!entry || entry.versions.length === 0) return null;
  return entry.versions[entry.versions.length - 1];
}

/** All recorded versions for a path (oldest first); empty array when absent. */
function getVersions(absPath) {
  const entry = store.get(absPath);
  return entry ? entry.versions.slice() : [];
}

function dropSnapshot(absPath) {
  store.delete(absPath);
}

function moveSnapshot(fromAbsPath, toAbsPath) {
  const entry = store.get(fromAbsPath);
  if (!entry) return;
  store.delete(fromAbsPath);
  const existing = store.get(toAbsPath);
  if (existing) {
    // keep both chains, newest last, capped
    for (const v of entry.versions) {
      if (!existing.versions.some((x) => x.tag === v.tag)) existing.versions.push(v);
    }
    existing.versions.splice(0, Math.max(0, existing.versions.length - MAX_VERSIONS_PER_PATH));
    existing.touch = Date.now();
  } else {
    store.set(toAbsPath, entry);
    entry.touch = Date.now();
  }
}

function clearSnapshots() {
  store.clear();
}

module.exports = {
  MAX_PATHS,
  MAX_VERSIONS_PER_PATH,
  SNAPSHOT_MAX_BYTES,
  recordSnapshot,
  getSnapshot,
  getVersions,
  latestSnapshot,
  dropSnapshot,
  moveSnapshot,
  clearSnapshots,
  mergeRange,
};
