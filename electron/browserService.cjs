const { BrowserAutomation, httpUrl } = require('./browserAutomation.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
let persistTimer;
let manifestPath;
const deps = { getChatWindow: null, openExternal: null };
const verifiedGuests = new Map();
const announcedRequests = new Set();
function saveManifest(state = browser.state()) {
  if (!manifestPath) return;
  try { fs.writeFileSync(manifestPath, JSON.stringify(state.tabs.map(({ id, url, title, generation }) => ({ id, url, title, generation })))); } catch (e) { console.warn('[browser] manifest:', e.message); }
}
function chatWindow() { const win = deps.getChatWindow?.(); return win && !win.isDestroyed() ? win : null; }
const browser = new BrowserAutomation({
  describeTopic: (id) => deps.getTopicName?.(id) || '当前会话',
  emit: (state) => {
    if (manifestPath) { clearTimeout(persistTimer); persistTimer = setTimeout(() => saveManifest(state), 250); }
    const win = chatWindow();
    if (!win) return;
    // The renderer may have just died (render-process-gone) even though the
    // BrowserWindow itself is not yet destroyed. Guard before every send.
    const frame = win.webContents.mainFrame;
    if (!frame || frame.isDestroyed()) return;
    try {
      win.webContents.send('browser:state', state);
      const owned = new Set(state.tabs.filter((tab) => tab.control).map((tab) => `${tab.control.topicId}:${tab.control.requestId}:${tab.id}`));
      for (const key of announcedRequests) if (!owned.has(key)) announcedRequests.delete(key);
      const active = state.tabs.find((tab) => tab.id === state.activeTabId && tab.control);
      if (active) {
        const key = `${active.control.topicId}:${active.control.requestId}:${active.id}`;
        if (!announcedRequests.has(key)) {
          announcedRequests.add(key);
          win.webContents.send('browser:pane:open', { tabId: active.id, url: active.url });
        }
      }
    } catch { /* renderer disposed during teardown or navigation */ }
  },
  abort: (topicId, requestId) => {
    const { manager } = require('./ai/streamManager/AiStreamManager.cjs');
    if (manager.activeStreams.get(topicId)?.requestId === requestId) manager.abort(topicId);
  },
});
function isHttpUrl(url) { try { httpUrl(url); return true; } catch { return false; } }
function resolveNavigationUrl(url, baseUrl) { try { return new URL(String(url), baseUrl || 'about:blank').href; } catch { return String(url || ''); } }
function openBrowserTab(url, options = {}) {
  const normalized = resolveNavigationUrl(String(url || '').trim(), options.baseUrl);
  if (!isHttpUrl(normalized)) return { ok: false, reason: 'invalid_url' };
  const win = chatWindow();
  if (!win) { deps.openExternal?.(normalized); return { ok: true, fallback: 'external', url: normalized }; }
  const existing = [...browser.tabs.values()].find((t) => (t.wc && !t.wc.isDestroyed() ? t.wc.getURL() : t.url) === normalized);
  const tabId = existing?.id || browser.add(normalized);
  browser.activeTabId = tabId;
  browser.changed();
  if (!win.isVisible()) win.show();
  win.focus();
  try { win.webContents.send('browser:pane:open', { url: normalized, tabId }); } catch { /* renderer disposed */ }
  return { ok: true, tabId, url: normalized };
}
function attachWindowOpenHandler(contents) {
  if (!contents || contents.isDestroyed()) return;
  contents.on('did-attach-webview', (_event, guest) => {
    if (contents === chatWindow()?.webContents) {
      verifiedGuests.set(guest.id, contents.id);
      const guestId = guest.id;
      guest.once('destroyed', () => verifiedGuests.delete(guestId));
      guest.on('will-navigate', (event, url) => { if (!isHttpUrl(url) && url !== 'about:blank') event.preventDefault(); });
    }
  });
  const contentsId = contents.id;
  contents.once('destroyed', () => { if (contentsId === browser.ownerId) browser.resetOwner('owner_destroyed'); });
  contents.on('render-process-gone', () => { if (contentsId === browser.ownerId) browser.resetOwner('owner_process_gone'); });
  contents.setWindowOpenHandler(({ url }) => {
    const resolved = resolveNavigationUrl(url, contents.getURL());
    if (isHttpUrl(resolved)) {
      // Agent-triggered popups are tabs in this browser, never external apps.
      const parent = [...browser.tabs.values()].find((t) => t.wc === contents);
      if (parent?.control) {
        const id = browser.add(resolved);
        const child = browser.tabs.get(id);
        child.control = { ...parent.control };
        child.action = '打开链接';
        browser.changed();
      } else openBrowserTab(resolved);
    }
    return { action: 'deny' };
  });
}
function assertSender(sender) {
  if (sender !== chatWindow()?.webContents) throw new Error('browser_invalid_sender');
  browser.ownerId = sender.id;
}
function registerBrowserHandlers(ipcMain, handlerDeps = {}) {
  Object.assign(deps, handlerDeps);
  manifestPath = path.join(require('electron').app.getPath('userData'), 'browser-tabs.json');
  require('electron').app.on('before-quit', () => { clearTimeout(persistTimer); saveManifest(); });
  try {
    const saved = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!browser.tabs.size && Array.isArray(saved)) for (const item of saved.slice(0, 100)) {
      if (typeof item.id !== 'string' || !(item.url === 'about:blank' || isHttpUrl(item.url))) continue;
      const id = browser.add(item.url, item.id);
      Object.assign(browser.tabs.get(id), { title: item.title || item.url, generation: (Number(item.generation) || 1) + 1, resetReason: 'app_restarted' });
    }
  } catch { /* First launch has no manifest. */ }
  require('electron').session.fromPartition('persist:browser').on('will-download', (event, _item, contents) => {
    const tab = [...browser.tabs.values()].find((tab) => tab.wc === contents && tab.control);
    if (!tab) return;
    const folder = path.join(require('electron').app.getPath('userData'), 'browser-downloads');
    fs.mkdirSync(folder, { recursive: true });
    const target = path.join(folder, `${randomUUID()}-${path.basename(_item.getFilename())}`);
    _item.setSavePath(target);
    const record = { id: randomUUID(), filename: _item.getFilename(), path: target, status: 'progressing' };
    tab.downloads.push(record);
    if (tab.downloads.length > 30) tab.downloads.shift();
    _item.once('done', (_e, state) => { record.status = state; browser.changed(); });
    browser.changed();
  });
  ipcMain.handle('browser:open', (_event, payload) => openBrowserTab(typeof payload?.url === 'string' ? payload.url : '', { baseUrl: payload?.baseUrl }));
  ipcMain.handle('browser:register', (event, payload) => {
    assertSender(event.sender);
    const { webContents } = require('electron');
    const wc = webContents.fromId(payload?.webContentsId);
    if (!wc || verifiedGuests.get(wc.id) !== event.sender.id || wc.getType() !== 'webview' || wc.session !== require('electron').session.fromPartition('persist:browser')) throw new Error('browser_invalid_guest');
    browser.register(payload.tabId, wc);
    return { ok: true };
  });
  ipcMain.handle('browser:ui', async (event, payload = {}) => {
    assertSender(event.sender);
    try {
      const tab = browser.tabs.get(payload.tabId);
      switch (payload.action) {
        case 'state': break;
        case 'open': browser.add(payload.url || 'about:blank'); break;
        case 'navigate': {
          const raw = String(payload.url || '').trim();
          const url = httpUrl(/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^[^/:]+:\d+(?:[/?#]|$)/.test(raw) ? raw : `https://${raw}`);
          if (!tab) {
            if (payload.tabId) throw new Error('tab_not_found');
            browser.add(url);
            break;
          }
          if (tab.control) throw new Error('请先暂停并接管');
          if (tab.pending) throw new Error('页面操作仍在结束，请稍后重试');
          if (!tab.wc || tab.wc.isDestroyed()) throw new Error('页面尚未就绪，请稍后重试');
          tab.pending = true;
          tab.snapshotId = null;
          browser.changed();
          try {
            if (tab.wc.isLoadingMainFrame()) {
              await new Promise((resolve) => {
                const wc = tab.wc;
                const finish = () => { clearTimeout(timer); wc.removeListener('did-stop-loading', finish); resolve(); };
                const timer = setTimeout(finish, 1000);
                wc.once('did-stop-loading', finish);
                wc.stop();
              });
            }
            await tab.wc.loadURL(url);
          }
          finally { tab.pending = false; browser.changed(); }
          break;
        }
        case 'activate': if (!tab) throw new Error('tab_not_found'); browser.activeTabId = tab.id; browser.changed(); break;
        case 'close': browser.closeForUser(payload.tabId); break;
        case 'pause': browser.pause(payload.tabId); break;
        case 'resume': {
          const paused = browser.paused.get(payload.topicId);
          if (!paused) throw new Error('没有可继续的任务');
          const { manager } = require('./ai/streamManager/AiStreamManager.cjs');
          if (manager.isTopicStreaming(paused.topicId)) throw new Error('任务正在停止，请稍后继续');
          if ([...browser.tabs.values()].some((t) => t.pending)) throw new Error('页面操作仍在结束，请稍后继续');
          event.sender.send('browser:resume', paused);
          break;
        }
        case 'discard': browser.discardTopic(payload.topicId); break;
        default: throw new Error('invalid_action');
      }
      return { ok: true, ...browser.state() };
    } catch (e) { return { ok: false, error: e.message }; }
  });
}
async function executeBrowserTool(name, args, toolDeps) {
  if (!chatWindow() || toolDeps.sender !== chatWindow().webContents) return { ok: false, error: 'browser_window_unavailable' };
  browser.ownerId = toolDeps.sender.id;
  return browser.execute(name, args, toolDeps);
}
module.exports = { browser, executeBrowserTool, isHttpUrl, resolveNavigationUrl, openBrowserTab, attachWindowOpenHandler, registerBrowserHandlers };
