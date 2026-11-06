const deps = { getChatWindow: null, openExternal: null };

function isHttpUrl(url) {
  try {
    const u = new URL(String(url));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function resolveNavigationUrl(url, baseUrl) {
  try {
    return new URL(String(url), baseUrl || 'about:blank').href;
  } catch {
    return String(url || '');
  }
}

function genTabId() {
  return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function openBrowserTab(url, options = {}) {
  const baseUrl = options.baseUrl || '';
  const normalized = resolveNavigationUrl(String(url || '').trim(), baseUrl);
  if (!isHttpUrl(normalized)) {
    return { ok: false, reason: 'invalid_url' };
  }

  const tabId = genTabId();
  const win = deps.getChatWindow && deps.getChatWindow();
  if (!win || win.isDestroyed()) {
    // No chat window (e.g. link opened from the Live2D main window):
    // fall back to the system browser so the link is never dropped.
    deps.openExternal && deps.openExternal(normalized);
    return { ok: true, fallback: 'external', url: normalized };
  }

  if (!win.isVisible()) win.show();
  win.focus();
  win.webContents.send('browser:pane:open', { url: normalized, tabId });
  return { ok: true, tabId, url: normalized };
}

function attachWindowOpenHandler(contents) {
  if (!contents || contents.isDestroyed()) return;

  contents.setWindowOpenHandler(({ url }) => {
    const baseUrl = contents.getURL();
    const resolved = resolveNavigationUrl(url, baseUrl);
    if (isHttpUrl(resolved)) {
      openBrowserTab(resolved, { baseUrl });
    }
    return { action: 'deny' };
  });
}

function registerBrowserHandlers(ipcMain, handlerDeps = {}) {
  deps.getChatWindow = handlerDeps.getChatWindow || null;
  deps.openExternal = handlerDeps.openExternal || null;

  ipcMain.handle('browser:open', async (_event, payload) => {
    const url = typeof payload?.url === 'string' ? payload.url : '';
    const baseUrl = typeof payload?.baseUrl === 'string' ? payload.baseUrl : '';
    return openBrowserTab(url, { baseUrl });
  });
}

module.exports = {
  isHttpUrl,
  resolveNavigationUrl,
  openBrowserTab,
  attachWindowOpenHandler,
  registerBrowserHandlers,
};
