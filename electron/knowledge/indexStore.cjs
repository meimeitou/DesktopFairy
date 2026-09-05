'use strict';

const fs = require('fs');
const Database = require('better-sqlite3');
const catalog = require('./catalog.cjs');
const {
  INDEX_SCHEMA_VERSION,
  cosineSimilarity,
  float32ToBuffer,
  bufferToFloat32,
} = require('./lib.cjs');

const openDbs = new Map();

function tryLoadSqliteVec(db) {
  try {
    const sqliteVec = require('sqlite-vec');
    sqliteVec.load(db);
    return true;
  } catch (e) {
    console.warn('[knowledge] sqlite-vec unavailable, using brute-force cosine:', e?.message || e);
    return false;
  }
}

function openIndex(baseId) {
  let db = openDbs.get(baseId);
  if (db) return db;
  catalog.ensureDir(catalog.baseDir(baseId));
  db = new Database(catalog.indexPath(baseId));
  db.pragma('journal_mode = WAL');
  const vecEnabled = tryLoadSqliteVec(db);
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      embedding BLOB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chunks_item ON chunks(item_id);
  `);
  const version = db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version');
  if (!version) {
    db.prepare('INSERT INTO meta(key, value) VALUES(?, ?)').run('schema_version', String(INDEX_SCHEMA_VERSION));
  }
  db.prepare('INSERT OR REPLACE INTO meta(key, value) VALUES(?, ?)').run('vec_enabled', vecEnabled ? '1' : '0');
  openDbs.set(baseId, db);
  return db;
}

function closeIndex(baseId) {
  const db = openDbs.get(baseId);
  if (!db) return;
  db.close();
  openDbs.delete(baseId);
}

function dropIndexFile(baseId) {
  closeIndex(baseId);
  try { fs.rmSync(catalog.indexPath(baseId), { force: true }); } catch { /* ignore */ }
  try { fs.rmSync(`${catalog.indexPath(baseId)}-wal`, { force: true }); } catch { /* ignore */ }
  try { fs.rmSync(`${catalog.indexPath(baseId)}-shm`, { force: true }); } catch { /* ignore */ }
}

function deleteItemChunks(baseId, itemId) {
  const db = openIndex(baseId);
  db.prepare('DELETE FROM chunks WHERE item_id = ?').run(itemId);
}

function replaceItemChunks(baseId, itemId, chunks) {
  const db = openIndex(baseId);
  const del = db.prepare('DELETE FROM chunks WHERE item_id = ?');
  const insert = db.prepare(
    'INSERT INTO chunks(item_id, chunk_index, text, embedding) VALUES(?, ?, ?, ?)',
  );
  const tx = db.transaction(() => {
    del.run(itemId);
    for (const chunk of chunks) {
      insert.run(itemId, chunk.chunkIndex, chunk.text, float32ToBuffer(chunk.embedding));
    }
  });
  tx();
  if (chunks[0]?.embedding?.length) {
    db.prepare('INSERT OR REPLACE INTO meta(key, value) VALUES(?, ?)').run(
      'embedding_dim',
      String(chunks[0].embedding.length),
    );
  }
}

function queryIndex(baseId, queryEmbedding, topK, minScore = 0) {
  const db = openIndex(baseId);
  const rows = db.prepare('SELECT item_id, chunk_index, text, embedding FROM chunks').all();
  const scored = [];
  const threshold = Number.isFinite(minScore) ? minScore : 0;
  for (const row of rows) {
    const vec = bufferToFloat32(row.embedding);
    const score = cosineSimilarity(queryEmbedding, vec);
    if (score < threshold) continue;
    scored.push({
      itemId: row.item_id,
      chunkIndex: row.chunk_index,
      text: row.text,
      score,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(1, topK));
}

function readItemText(baseId, itemId) {
  const db = openIndex(baseId);
  const rows = db.prepare(
    'SELECT text FROM chunks WHERE item_id = ? ORDER BY chunk_index ASC',
  ).all(itemId);
  return rows.map((row) => row.text).join('\n\n');
}

module.exports = {
  openIndex,
  closeIndex,
  dropIndexFile,
  deleteItemChunks,
  replaceItemChunks,
  queryIndex,
  readItemText,
};
