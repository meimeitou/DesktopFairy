'use strict';
// Run with Node, or ELECTRON_RUN_AS_NODE=1 <Electron> scripts/benchmark-vault.cjs.
// Uses an isolated temporary vault and removes it on completion.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Worker } = require('worker_threads');
const count = Math.max(100, Number(process.argv[2]) || 50000);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'df-vault-bench-'));
const vault = { id: 'benchmark', name: 'benchmark', path: fs.realpathSync(temp), excludes: ['indexes'] };
let sequence = 0;
const pending = new Map();
const worker = new Worker(path.resolve(__dirname, '../electron/knowledge/vaultWorker.cjs'), { workerData: { indexDir: path.join(temp, 'indexes') } });
worker.on('message', ({ id, result, error }) => {
  const task = pending.get(id); if (!task) return;
  pending.delete(id); error ? task.reject(new Error(error)) : task.resolve(result);
});
worker.on('error', (error) => { for (const task of pending.values()) task.reject(error); });
function rpc(method, args = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); worker.postMessage({ id, method, args, vaults: [vault] }); });
}
(async () => {
  try {
    const body = '中文知识管理与英文 Electron development notes. Markdown 全文检索、后台更新和本地文件读取。\n'.repeat(32);
    for (let i = 0; i < count; i++) {
      if (i % 500 === 0) fs.mkdirSync(path.join(temp, 'group-' + Math.floor(i / 500)));
      fs.writeFileSync(path.join(temp, 'group-' + Math.floor(i / 500), `note-${i}.md`), `---\naliases: [alias${i}]\ntags: [topic${i % 100}]\n---\n# 笔记 ${i}\n${body}\nunique${i}\n`);
    }
    const start = performance.now();
    const status = await rpc('scan');
    if (status.fileCount !== count || status.errors.length) throw new Error(JSON.stringify(status));
    const indexMs = performance.now() - start;
    const samples = [];
    for (let i = 0; i < 40; i++) {
      const query = ['全文检索', 'Electron development', 'topic42', 'unique123', '中文知识'][i % 5];
      const t = performance.now(); const result = await rpc('search', { query, limit: 10 });
      if (!result.hits.length) throw new Error('Missing query results: ' + query);
      samples.push(performance.now() - t);
    }
    const changed = performance.now();
    fs.appendFileSync(path.join(temp, 'group-0/note-0.md'), '\n变更延迟验收');
    await rpc('scan'); const update = await rpc('search', { query: '变更延迟验收' });
    if (!update.hits.length) throw new Error('Incremental update missing');
    const updateMs = performance.now() - changed;
    samples.sort((a, b) => a - b);
    const result = { count, bytesPerNote: Buffer.byteLength(body), indexMs: Math.round(indexMs), queryP95Ms: Math.round(samples[Math.ceil(samples.length * .95) - 1]), queryMaxMs: Math.round(samples.at(-1)), incrementalReconcileMs: Math.round(updateMs), watcherDebounceMs: 350 };
    console.log(JSON.stringify(result, null, 2));
    if (result.queryP95Ms > 500 || result.incrementalReconcileMs + 350 > 3000) process.exitCode = 1;
  } finally { await worker.terminate(); fs.rmSync(temp, { recursive: true, force: true }); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
