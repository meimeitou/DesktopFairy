'use strict';
// Isolated Electron smoke test: native SQLite worker, real preload/IPC, agent dispatch and UI captures.
// Usage: node_modules/.bin/electron scripts/smoke-vault-electron.cjs [packaged app.asar]
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert/strict');
const codeRoot = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'df-vault-electron-'));
const captures = path.join(os.tmpdir(), 'desktopfairy-vault-review');
fs.mkdirSync(captures, { recursive: true });
app.setPath('userData', path.join(temp, 'appdata'));
app.commandLine.appendSwitch('disable-gpu');
const vaultPath = path.join(temp, '示例笔记'); fs.mkdirSync(vaultPath);
fs.mkdirSync(path.join(vaultPath, '.obsidian'));
fs.mkdirSync(path.join(vaultPath, 'private'));
fs.writeFileSync(path.join(vaultPath, 'private/日记.md'), '不要索引的私人笔记');
fs.writeFileSync(path.join(vaultPath, '项目规划.md'), '---\naliases: [桌面助手]\ntags: [产品, 开发]\n---\n# DesktopFairy 项目规划\n\n## 知识库\n从 Obsidian vault 读取笔记，按需搜索和引用。\n\n## 后续安排\n验证中文搜索、增量更新和内部链接。\n');
fs.writeFileSync(path.join(vaultPath, '使用说明.md'), '# 使用说明\n\n通过 [[项目规划#知识库]] 查看规划。\n');
const vault = { id: 'smoke-vault', name: '示例笔记', path: fs.realpathSync(vaultPath), obsidian: true, excludes: ['private'], createdAt: Date.now() };
fs.mkdirSync(path.join(app.getPath('userData'), 'vault-knowledge'), { recursive: true });
fs.writeFileSync(path.join(app.getPath('userData'), 'vault-knowledge/vaults.json'), JSON.stringify({ version: 1, vaults: [vault] }));
let window;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, label) {
  for (let i = 0; i < 150; i++) { if (await check()) return; await sleep(100); }
  throw new Error('Timed out: ' + label);
}
app.whenReady().then(async () => {
  try {
    ipcMain.on('settings:load:sync', (event) => { event.returnValue = null; });
    const service = require(path.join(codeRoot, 'electron/knowledge/vaultService.cjs'));
    service.registerKnowledgeHandlers(ipcMain);
    await until(() => service.listBases()[0].state === 'ready', 'initial index');
    assert.equal(service.listBases()[0].fileCount, 2);
    const { getBuiltinTools, buildAgentToolDeps } = require(path.join(codeRoot, 'electron/ai/agentStreamShared.cjs'));
    const { executeAgentTool } = require(path.join(codeRoot, 'electron/agentTools.cjs'));
    for (const context of ['local', 'terminal', 'terminal-ssh', 'host']) {
      const config = { chatMode: 'plan', envVars: {}, enabledSkillIds: [], mcpServerIds: [] };
      assert(!getBuiltinTools(config, context, []).some((t) => t.function.name === 'kb_search'));
      assert(getBuiltinTools(config, context, [vault.id]).some((t) => t.function.name === 'kb_search'));
      const deps = buildAgentToolDeps({ agentConfig: config, context, knowledgeBaseIds: [vault.id], mcpRuntime: null });
      const response = await executeAgentTool({ id: 'smoke', function: { name: 'kb_search', arguments: JSON.stringify({ query: '知识库' }) } }, deps);
      assert.equal(response.denied, false); assert(JSON.parse(response.resultText).hits.length);
      const denied = await executeAgentTool({ id: 'scope', function: { name: 'kb_read', arguments: JSON.stringify({ baseId: 'unbound', path: '项目规划.md' }) } }, deps);
      assert.equal(JSON.parse(denied.resultText).ok, false);
    }
    const controller = new AbortController(); controller.abort();
    await assert.rejects(service.query('search', { baseIds: [vault.id], query: '知识库' }, controller.signal), { name: 'AbortError' });
    const changed = performance.now();
    fs.appendFileSync(path.join(vaultPath, '使用说明.md'), '\n监听更新验收\n');
    await until(async () => (await service.query('search', { baseIds: [vault.id], query: '监听更新验收' })).hits.length > 0, 'watcher update');
    console.log('watcher update ms:', Math.round(performance.now() - changed));
    window = new BrowserWindow({ width: 1200, height: 850, show: false, webPreferences: { preload: path.join(codeRoot, 'electron/preload.cjs'), contextIsolation: true, nodeIntegration: false } });
    const errors = [];
    window.webContents.on('console-message', (_event, level, text) => { if (level >= 3) errors.push(text); });
    await window.loadFile(path.join(codeRoot, 'dist/index.html'), { query: { window: 'chat', view: 'knowledge' } });
    await until(() => window.webContents.executeJavaScript("!!document.querySelector('.vault-search-form')"), 'knowledge page');
    await window.webContents.executeJavaScript(`(() => {
      const input = document.querySelector('.vault-search-form input');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '知识库');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await sleep(100);
    await window.webContents.executeJavaScript("document.querySelector('.vault-search-form').requestSubmit()");
    await until(() => window.webContents.executeJavaScript("!!document.querySelector('.vault-result')"), 'search result');
    fs.writeFileSync(path.join(captures, 'search.png'), (await window.webContents.capturePage()).toPNG());
    await window.webContents.executeJavaScript("document.querySelector('.vault-result').click()");
    await until(() => window.webContents.executeJavaScript("!!document.querySelector('.vault-preview pre')"), 'source preview');
    await sleep(150);
    const previewVisible = await window.webContents.executeJavaScript("(() => { const r = document.querySelector('.vault-preview').getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight && document.activeElement === document.querySelector('.vault-preview'); })()");
    assert(previewVisible);
    fs.writeFileSync(path.join(captures, 'desktop.png'), (await window.webContents.capturePage()).toPNG());
    window.setSize(820, 720); await sleep(150);
    fs.writeFileSync(path.join(captures, 'compact.png'), (await window.webContents.capturePage()).toPNG());
    const overflow = await window.webContents.executeJavaScript('document.documentElement.scrollWidth > window.innerWidth');
    assert.equal(overflow, false);
    const updated = await window.webContents.executeJavaScript(`window.electronAPI.invoke('knowledge:update_base', {baseId:'smoke-vault',patch:{excludes:['private','项目规划.md']}})`);
    assert(updated.excludes.includes('项目规划.md'));
    await assert.rejects(service.query('read', { baseId: vault.id, path: '项目规划.md' }));
    const changedScope = await service.query('search', { baseIds: [vault.id], query: '知识库' });
    assert(changedScope.hits.every((hit) => hit.path !== '项目规划.md'));
    await window.webContents.executeJavaScript(`window.electronAPI.invoke('knowledge:delete_base', {baseId:'smoke-vault'})`);
    assert.equal(service.listBases().length, 0); assert(fs.existsSync(path.join(vaultPath, '项目规划.md')));
    await until(() => window.webContents.executeJavaScript("!!document.querySelector('.vault-empty')"), 'empty state after remove');
    window.setSize(1200, 850); await sleep(150);
    fs.writeFileSync(path.join(captures, 'empty.png'), (await window.webContents.capturePage()).toPNG());
    assert.deepEqual(errors, []);
    console.log('PASS: packaged native worker, agent tools (4 environments), cancellation, file watch, preload IPC, search/read UI, exclusions and removal.');
    console.log('captures:', captures);
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally {
    window?.destroy(); app.quit();
    setTimeout(() => { fs.rmSync(temp, { recursive: true, force: true }); app.exit(process.exitCode || 0); }, 300);
  }
});
