'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Worker } = require('worker_threads');
const { app, dialog, shell, BrowserWindow } = require('electron');
const { normalizeExcludes, resolveFile } = require('./vaultFiles.cjs');
let worker = null, sequence = 0, revision = 0;
const pending = new Map(), statuses = new Map(), watchers = new Map(), jobs = new Map();
let reconcileTimer;
function root() { return path.join(app.getPath('userData'), 'vault-knowledge'); }
function configPath() { return path.join(root(), 'vaults.json'); }
function catalog() {
  try {
    const data = JSON.parse(fs.readFileSync(configPath(), 'utf8'));
    if (!Array.isArray(data.vaults)) throw new Error('vault 配置损坏');
    return data.vaults;
  } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
function broadcast(windows = BrowserWindow.getAllWindows()) {
  for (const win of windows) {
    try {
      if (win.isDestroyed() || win.webContents.isDestroyed()) continue;
      const frame = win.webContents.mainFrame;
      if (!frame || frame.isDestroyed()) continue;
      frame.send('knowledge:updated');
    } catch {
      // A window or its renderer can disappear while status updates are sent.
    }
  }
}
function save(vaults) {
  fs.mkdirSync(root(), { recursive: true });
  fs.writeFileSync(configPath() + '.tmp', JSON.stringify({ version: 1, vaults }, null, 2));
  fs.renameSync(configPath() + '.tmp', configPath());
  revision++; broadcast();
}
function ensureWorker() {
  if (worker) return worker;
  const next = new Worker(path.join(__dirname, 'vaultWorker.cjs'), { workerData: { indexDir: path.join(root(), 'indexes') } });
  worker = next;
  next.on('message', (message) => {
    if (message.status) {
      if (catalog().some((v) => v.id === message.status.baseId)) { statuses.set(message.status.baseId, message.status); broadcast(); }
      return;
    }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id); request.cleanup();
    if (message.error) request.reject(new Error(message.error)); else request.resolve(message.result);
  });
  const fail = (error) => {
    if (worker !== next) return;
    worker = null;
    for (const request of pending.values()) { request.cleanup(); request.reject(error); }
    pending.clear();
    for (const [baseId, status] of statuses) statuses.set(baseId, { ...status, state: 'error', errors: [error.message] });
    broadcast();
  };
  next.on('error', fail);
  next.on('exit', (code) => fail(new Error('知识库索引进程已退出（' + code + '），将自动重试')));
  next.unref();
  return next;
}
function rpc(method, vaults, args = {}, signal) {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  const target = ensureWorker();
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const abort = () => {
      pending.delete(id); signal?.removeEventListener('abort', abort);
      target.postMessage({ id, method: 'cancel' });
      reject(new DOMException('Aborted', 'AbortError'));
    };
    pending.set(id, { resolve, reject, cleanup: () => signal?.removeEventListener('abort', abort) });
    signal?.addEventListener('abort', abort, { once: true });
    target.postMessage({ id, method, vaults, args });
  });
}
function listBases() {
  return catalog().map((vault) => ({ ...vault, kind: 'vault', fileCount: 0, state: 'pending', errors: [], ...statuses.get(vault.id) }));
}
function getVault(id) {
  const vault = catalog().find((entry) => entry.id === id);
  if (!vault) throw new Error('vault 不存在或已移除');
  return vault;
}
function validIds(ids) {
  const existing = new Set(catalog().map((v) => v.id));
  return [...new Set((Array.isArray(ids) ? ids : []).filter((id) => typeof id === 'string' && existing.has(id)))];
}
function schedule(vault, rebuild = false) {
  const current = jobs.get(vault.id);
  if (current) { current.dirty = true; current.rebuild ||= rebuild; return current.promise; }
  const job = { dirty: false, rebuild: false, promise: null };
  job.promise = (async () => {
    let nextRebuild = rebuild;
    do {
      job.dirty = false;
      try {
        const latest = getVault(vault.id);
        await rpc('scan', [latest], { rebuild: nextRebuild });
      } catch (error) {
        if (catalog().some((v) => v.id === vault.id)) {
          statuses.set(vault.id, { baseId: vault.id, state: 'error', fileCount: statuses.get(vault.id)?.fileCount || 0, errors: [error.message] });
          broadcast();
        }
      }
      nextRebuild = job.rebuild; job.rebuild = false;
    } while (job.dirty && catalog().some((v) => v.id === vault.id));
  })().finally(() => jobs.delete(vault.id));
  jobs.set(vault.id, job);
  return job.promise;
}
function watch(vault) {
  if (watchers.has(vault.id)) return;
  let timer;
  try {
    const watcher = fs.watch(vault.path, { recursive: true }, (_event, name) => {
      const relative = name?.toString().replace(/\\/g, '/');
      if (relative && (relative.split('/').some((p) => p.startsWith('.')) || vault.excludes.some((d) => relative === d || relative.startsWith(d + '/')))) return;
      clearTimeout(timer);
      timer = setTimeout(() => { void schedule(vault); }, 350);
    });
    const close = () => { clearTimeout(timer); watcher.close(); watchers.delete(vault.id); };
    watcher.on('error', () => { close(); void schedule(vault); });
    watcher.unref();
    watchers.set(vault.id, close);
  } catch { /* Reconciliation retries disconnected directories. */ }
}
async function mountPaths(paths) {
  const vaults = catalog(), added = [];
  for (const input of paths) {
    const resolved = fs.realpathSync(input);
    if (!fs.statSync(resolved).isDirectory()) throw new Error('请选择目录');
    if (vaults.some((v) => v.path === resolved)) continue;
    const nested = vaults.some((v) => resolved.startsWith(v.path + path.sep) || v.path.startsWith(resolved + path.sep));
    if (nested) throw new Error('不能重复挂载父目录与子目录：' + resolved);
    const vault = { id: crypto.randomUUID(), name: path.basename(resolved), path: resolved, excludes: [], obsidian: fs.existsSync(path.join(resolved, '.obsidian')), createdAt: Date.now() };
    vaults.push(vault); added.push(vault);
  }
  save(vaults);
  for (const vault of added) { watch(vault); void schedule(vault); }
  return added;
}
async function query(method, args = {}, signal) {
  const startRevision = revision;
  let vaults;
  if (method === 'search') vaults = validIds(args.baseIds).map(getVault);
  else vaults = [getVault(args.baseId)];
  const result = await rpc(method, vaults, args, signal);
  if (startRevision !== revision) throw new Error('vault 配置已变化，请重试');
  return result;
}
function registerKnowledgeHandlers(ipcMain) {
  ipcMain.handle('knowledge:list_bases', () => listBases());
  ipcMain.handle('knowledge:list_directories', (_event, args) => query('directories', args));
  ipcMain.handle('knowledge:select_vaults', async () => {
    const result = await dialog.showOpenDialog({ title: '选择 Obsidian vault 或 Markdown 目录', properties: ['openDirectory', 'multiSelections'] });
    if (result.canceled) return [];
    const plain = result.filePaths.filter((dir) => !fs.existsSync(path.join(dir, '.obsidian')));
    if (plain.length) {
      const choice = await dialog.showMessageBox({ type: 'info', message: '部分目录未检测到 Obsidian 配置', detail: '仍可作为 Markdown 目录挂载：\n' + plain.join('\n'), buttons: ['挂载目录', '取消'], cancelId: 1 });
      if (choice.response !== 0) return [];
    }
    return mountPaths(result.filePaths);
  });
  ipcMain.handle('knowledge:update_base', async (_event, { baseId, patch = {} }) => {
    const vaults = catalog(), vault = getVault(baseId);
    const next = { ...vault, name: String(patch.name ?? vault.name).trim() || vault.name, excludes: normalizeExcludes(patch.excludes ?? vault.excludes) };
    save(vaults.map((v) => v.id === baseId ? next : v));
    watchers.get(baseId)?.(); watch(next); void schedule(next);
    return next;
  });
  ipcMain.handle('knowledge:delete_base', async (_event, { baseId }) => {
    const vault = getVault(baseId);
    save(catalog().filter((v) => v.id !== baseId));
    watchers.get(baseId)?.(); statuses.delete(baseId);
    await jobs.get(baseId)?.promise;
    await rpc('drop', [vault]);
    return { ok: true };
  });
  ipcMain.handle('knowledge:rebuild_all', (_event, { baseId } = {}) => {
    for (const vault of baseId ? [getVault(baseId)] : catalog()) void schedule(vault, true);
    return { ok: true };
  });
  ipcMain.handle('knowledge:search', (_event, args) => query('search', args));
  ipcMain.handle('knowledge:read_item', (_event, args) => query('read', args));
  ipcMain.handle('knowledge:resolve_link', (_event, args) => query('resolve', args));
  ipcMain.handle('knowledge:open_file', async (_event, { baseId, path: relative }) => {
    const vault = getVault(baseId), file = resolveFile(vault, relative);
    if (vault.obsidian) await shell.openExternal('obsidian://open?path=' + encodeURIComponent(file));
    else { const error = await shell.openPath(file); if (error) throw new Error(error); }
    return { ok: true };
  });
  ipcMain.handle('knowledge:open_vault', async (_event, { baseId }) => {
    const vault = getVault(baseId);
    await shell.openExternal('obsidian://open?path=' + encodeURIComponent(vault.path));
    return { ok: true };
  });
  for (const vault of catalog()) { watch(vault); void schedule(vault); }
  reconcileTimer = setInterval(() => {
    for (const vault of catalog()) { watch(vault); void schedule(vault); }
  }, 60000);
  reconcileTimer.unref();
  app.once('before-quit', () => {
    clearInterval(reconcileTimer);
    for (const close of watchers.values()) close();
    const current = worker; worker = null;
    for (const request of pending.values()) { request.cleanup(); request.reject(new Error('应用正在退出')); }
    pending.clear(); void current?.terminate();
  });
}
module.exports = { registerKnowledgeHandlers, listBases, validIds, query, broadcast };
