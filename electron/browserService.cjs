const { BrowserWindow, screen } = require('electron');
const path = require('path');

let browserWindow = null;
let loadURLFn = null;
let shouldOpenDevTools = () => false;
let getDevToolsMode = () => 'detach';

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

function isBrowserGuestWebContents(contents) {
  if (!browserWindow || browserWindow.isDestroyed()) return false;
  const host = contents.hostWebContents;
  return host && !host.isDestroyed() && host.id === browserWindow.webContents.id;
}

function closeBrowserWindow() {
  if (!browserWindow || browserWindow.isDestroyed()) return;
  browserWindow.close();
}

function bindBrowserCloseShortcut(contents) {
  if (!contents || contents.isDestroyed()) return;
  if (contents.__dfBrowserCloseShortcutBound) return;
  contents.__dfBrowserCloseShortcutBound = true;

  contents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || input.isAutoRepeat) return;
    const mod = process.platform === 'darwin' ? input.meta : input.control;
    if (!mod || input.alt || input.shift) return;
    if (String(input.key || '').toLowerCase() !== 'w') return;
    event.preventDefault();
    closeBrowserWindow();
  });
}

function sendOpenTab(payload) {
  if (!browserWindow || browserWindow.isDestroyed()) return;
  const send = () => {
    if (!browserWindow || browserWindow.isDestroyed()) return;
    browserWindow.webContents.send('browser:open_tab', payload);
  };
  if (browserWindow.webContents.isLoading()) {
    browserWindow.webContents.once('dom-ready', send);
  } else {
    send();
  }
}

function createBrowserWindow() {
  if (browserWindow && !browserWindow.isDestroyed()) {
    return browserWindow;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const winWidth = Math.min(1000, Math.max(640, Math.round(width * 0.7)));
  const winHeight = Math.min(720, Math.max(480, Math.round(height * 0.75)));

  browserWindow = new BrowserWindow({
    title: '浏览器',
    width: winWidth,
    height: winHeight,
    minWidth: 480,
    minHeight: 360,
    center: true,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f0f19',
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hidden',
          titleBarOverlay: {
            color: '#0f0f19',
            symbolColor: 'rgba(255, 255, 255, 0.72)',
            height: 44,
          },
          trafficLightPosition: { x: 14, y: 13 },
        }
      : { frame: true }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
    },
  });

  loadURLFn(browserWindow, '?window=browser');
  bindBrowserCloseShortcut(browserWindow.webContents);
  browserWindow.webContents.on('did-attach-webview', (_event, guestContents) => {
    bindBrowserCloseShortcut(guestContents);
  });

  if (shouldOpenDevTools()) {
    browserWindow.webContents.openDevTools({ mode: getDevToolsMode() });
  }

  browserWindow.once('ready-to-show', () => {
    if (!browserWindow || browserWindow.isDestroyed()) return;
    browserWindow.show();
    browserWindow.focus();
  });

  browserWindow.on('closed', () => {
    browserWindow = null;
  });

  return browserWindow;
}

function openBrowserTab(url, options = {}) {
  const baseUrl = options.baseUrl || '';
  const normalized = resolveNavigationUrl(String(url || '').trim(), baseUrl);
  if (!isHttpUrl(normalized)) {
    return { ok: false, reason: 'invalid_url' };
  }

  createBrowserWindow();
  const tabId = genTabId();
  sendOpenTab({ url: normalized, tabId });

  if (browserWindow && !browserWindow.isDestroyed()) {
    if (!browserWindow.isVisible()) browserWindow.show();
    browserWindow.focus();
  }

  return { ok: true, tabId, url: normalized };
}

function openBrowserUrl(url, options = {}) {
  return openBrowserTab(url, options);
}

function attachWindowOpenHandler(contents) {
  if (!contents || contents.isDestroyed()) return;

  contents.setWindowOpenHandler(({ url }) => {
    const baseUrl = contents.getURL();
    const resolved = resolveNavigationUrl(url, baseUrl);
    if (isHttpUrl(resolved)) {
      if (isBrowserGuestWebContents(contents)) {
        sendOpenTab({ url: resolved, tabId: genTabId() });
      } else {
        openBrowserTab(resolved, { baseUrl });
      }
    }
    return { action: 'deny' };
  });
}

function registerBrowserHandlers(ipcMain, deps = {}) {
  loadURLFn = deps.loadURL;
  shouldOpenDevTools = deps.shouldOpenDevTools || (() => false);
  getDevToolsMode = deps.getDevToolsMode || (() => 'detach');

  ipcMain.handle('browser:open', async (_event, payload) => {
    const url = typeof payload?.url === 'string' ? payload.url : '';
    const baseUrl = typeof payload?.baseUrl === 'string' ? payload.baseUrl : '';
    return openBrowserTab(url, { baseUrl });
  });
}

module.exports = {
  isHttpUrl,
  resolveNavigationUrl,
  openBrowserUrl,
  openBrowserTab,
  attachWindowOpenHandler,
  registerBrowserHandlers,
};
