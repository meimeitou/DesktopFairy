'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function knowledgeRoot() {
  return path.join(app.getPath('userData'), 'knowledge');
}

function catalogPath() {
  return path.join(knowledgeRoot(), 'catalog.json');
}

function baseDir(baseId) {
  return path.join(knowledgeRoot(), baseId);
}

function rawDir(baseId) {
  return path.join(baseDir(baseId), 'raw');
}

function indexPath(baseId) {
  return path.join(baseDir(baseId), 'index.sqlite');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `kb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyCatalog() {
  return { version: 1, bases: [] };
}

function readCatalog() {
  try {
    const raw = fs.readFileSync(catalogPath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.bases)) return emptyCatalog();
    return { version: 1, bases: parsed.bases };
  } catch {
    return emptyCatalog();
  }
}

function writeCatalog(catalog) {
  ensureDir(knowledgeRoot());
  fs.writeFileSync(catalogPath(), JSON.stringify(catalog, null, 2));
}

function listBases() {
  return readCatalog().bases.map((base) => ({
    ...base,
    items: Array.isArray(base.items) ? base.items : [],
  }));
}

function getBase(baseId) {
  return listBases().find((b) => b.id === baseId) || null;
}

function saveBase(nextBase) {
  const catalog = readCatalog();
  const idx = catalog.bases.findIndex((b) => b.id === nextBase.id);
  if (idx === -1) catalog.bases.push(nextBase);
  else catalog.bases[idx] = nextBase;
  writeCatalog(catalog);
  return nextBase;
}

function deleteBase(baseId) {
  const catalog = readCatalog();
  catalog.bases = catalog.bases.filter((b) => b.id !== baseId);
  writeCatalog(catalog);
  const dir = baseDir(baseId);
  fs.rmSync(dir, { recursive: true, force: true });
}

function createBase({ name }) {
  const now = Date.now();
  const base = {
    id: genId(),
    name: String(name || '').trim() || '未命名知识库',
    createdAt: now,
    updatedAt: now,
    items: [],
  };
  ensureDir(rawDir(base.id));
  return saveBase(base);
}

function updateBase(baseId, patch) {
  const base = getBase(baseId);
  if (!base) throw new Error('知识库不存在');
  if (typeof patch.name === 'string' && patch.name.trim()) base.name = patch.name.trim();
  base.updatedAt = Date.now();
  return saveBase(base);
}

function upsertItem(baseId, item) {
  const base = getBase(baseId);
  if (!base) throw new Error('知识库不存在');
  const idx = base.items.findIndex((row) => row.id === item.id);
  if (idx === -1) base.items.push(item);
  else base.items[idx] = item;
  base.updatedAt = Date.now();
  saveBase(base);
  return item;
}

function removeItem(baseId, itemId) {
  const base = getBase(baseId);
  if (!base) throw new Error('知识库不存在');
  const item = base.items.find((row) => row.id === itemId);
  base.items = base.items.filter((row) => row.id !== itemId);
  base.updatedAt = Date.now();
  saveBase(base);
  if (item?.relativePath) {
    const abs = path.join(rawDir(baseId), item.relativePath);
    try { fs.rmSync(abs, { force: true }); } catch { /* ignore */ }
  }
  if (item?.indexedRelativePath) {
    const abs = path.join(rawDir(baseId), item.indexedRelativePath);
    try { fs.rmSync(abs, { force: true }); } catch { /* ignore */ }
  }
  return item;
}

function getItem(baseId, itemId) {
  const base = getBase(baseId);
  if (!base) return null;
  return base.items.find((row) => row.id === itemId) || null;
}

function listItemFileNames(base) {
  return (base.items || [])
    .filter((item) => item.type === 'file')
    .map((item) => item.sourceName);
}

module.exports = {
  knowledgeRoot,
  catalogPath,
  baseDir,
  rawDir,
  indexPath,
  ensureDir,
  genId,
  readCatalog,
  listBases,
  getBase,
  saveBase,
  deleteBase,
  createBase,
  updateBase,
  upsertItem,
  removeItem,
  getItem,
  listItemFileNames,
};
