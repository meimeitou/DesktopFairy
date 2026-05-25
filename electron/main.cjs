const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, globalShortcut, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const selectionService = require('./selectionService.cjs');
const { registerFileHandlers } = require('./fileService.cjs');
const { registerScreenshotHandlers, captureRegion } = require('./screenshotService.cjs');
const {
  registerLive2DSchemes,
  registerLive2DProtocol,
  registerLive2DHandlers,
} = require('./live2dService.cjs');
const { registerChatSessionHandlers } = require('./chatSessionService.cjs');

registerLive2DSchemes();

// Dev server URL (Vite)
const DEV_SERVER_URL = 'http://localhost:5173';
// Production: load from built files
const PROD_INDEX_PATH = path.join(__dirname, '../dist/index.html');

const isDev = !app.isPackaged;

const shouldOpenDevTools = () =>
  isDev && process.env.ELECTRON_OPEN_DEVTOOLS === '1';

const getDevToolsMode = () => {
  const mode = process.env.ELECTRON_DEVTOOLS_MODE || 'detach';
  return ['detach', 'right', 'bottom', 'undocked'].includes(mode) ? mode : 'detach';
};

// Scan public/models for model subdirectories
const MODELS_DIR = isDev
  ? path.join(__dirname, '../public/models')
  : path.join(__dirname, '../dist/models');

const PUBLIC_ROOT = isDev
  ? path.join(__dirname, '../public')
  : path.join(__dirname, '../dist');

let mainWindow = null;
let chatWindow = null;
let tray = null;
let isQuitting = false;
let currentShortcut = 'Command+Shift+C'; // mirrored for get_shortcut IPC

const selectionDeps = () => ({
  loadURL,
  isDev,
});

const applySelectionSettings = (settings) => {
  const result = selectionService.applySelectionSettings(settings, selectionDeps());
  if (settings?.selectionShortcut) {
    currentShortcut = settings.selectionShortcut;
  }
  return result;
};

const SETTINGS_PATH = () => path.join(app.getPath('userData'), 'da_settings.json');
const CHAT_SESSION_PATH = () => path.join(app.getPath('userData'), 'da_chat.json');

const loadSettingsFromDisk = () => {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH(), 'utf8'));
  } catch {
    return null;
  }
};


// In-flight chat completion requests, keyed by requestId
const inflightChats = new Map();

const TRAY_ICON_PATH = () => path.join(PUBLIC_ROOT, 'trayIconTemplate.png');
const TRAY_GUID = 'com.desktop.fairy.status';

// Fallback: 16x16 black circle PNG (template image)
const FALLBACK_TRAY_ICON_B64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKUlEQVQ4T2NkYGD4z0ABYBw1gGE0DBQUGigwUGBooMBAgYECAwC5FQX+pR8CzQAAAABJRU5ErkJggg==';

const getTrayIcon = () => {
  if (process.platform === 'darwin') {
    const img = nativeImage.createFromPath(TRAY_ICON_PATH());
    if (!img.isEmpty()) {
      const sized = img.resize({ width: 16, height: 16 });
      sized.setTemplateImage(true);
      return sized;
    }
  } else {
    const legacyPath = path.join(PUBLIC_ROOT, 'trayTemplate.png');
    const legacy = nativeImage.createFromPath(legacyPath);
    if (!legacy.isEmpty()) return legacy.resize({ width: 22, height: 22 });
  }

  const fallback = nativeImage.createFromDataURL('data:image/png;base64,' + FALLBACK_TRAY_ICON_B64);
  if (process.platform === 'darwin') {
    const sized = fallback.resize({ width: 16, height: 16 });
    sized.setTemplateImage(true);
    return sized;
  }
  return fallback.resize({ width: 22, height: 22 });
};

/** Hide Dock after Tray is registered (menu-bar-only app). */
const hideMacDock = () => {
  if (process.platform !== 'darwin') return;
  app.setActivationPolicy('accessory');
  if (app.dock?.hide) app.dock.hide();
};

const destroyTray = () => {
  if (tray && !tray.isDestroyed()) {
    tray.removeAllListeners();
    tray.destroy();
  }
  tray = null;
};

let trayRefreshTimer = null;
const scheduleTrayRefresh = () => {
  if (process.platform !== 'darwin') return;
  if (trayRefreshTimer) clearTimeout(trayRefreshTimer);
  trayRefreshTimer = setTimeout(() => {
    trayRefreshTimer = null;
    setupTray();
    hideMacDock();
  }, 250);
};

// macOS: make window float above all spaces and all other windows.
const floatWindowOnAllSpaces = (win) => {
  if (process.platform === 'darwin') {
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
};

const loadURL = (win, queryString = '') => {
  if (isDev) {
    win.loadURL(`${DEV_SERVER_URL}/index.html${queryString}`);
  } else {
    win.loadFile(PROD_INDEX_PATH, { query: queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {} });
  }
};

const navigateChatWindow = (win, view = 'chat') => {
  if (!win || win.isDestroyed()) return;
  const send = () => win.webContents.send('chat:navigate', view);
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', send);
  } else {
    send();
  }
};

const createChatWindow = (options = {}) => {
  const { view = 'chat' } = options;

  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.show();
    chatWindow.focus();
    navigateChatWindow(chatWindow, view);
    return chatWindow;
  }

  chatWindow = new BrowserWindow({
    title: ' ',
    width: 640,
    height: 520,
    minWidth: 640,
    minHeight: 520,
    resizable: true,
    center: true,
    show: true,
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
      : { frame: false }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const query = view === 'settings' ? '?window=chat&view=settings' : '?window=chat';
  loadURL(chatWindow, query);

  chatWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      chatWindow.hide();
    }
  });

  chatWindow.on('closed', () => {
    chatWindow = null;
  });

  return chatWindow;
};

const getScreenshotWindows = () => [mainWindow, chatWindow];

const sendChatPrefill = (payload) => {
  const win = createChatWindow({ view: 'chat' });
  const data = payload || { text: '', autoSend: false };
  const send = () => win.webContents.send('chat:prefill', data);
  if (win.webContents.isLoading()) {
    win.webContents.once('dom-ready', send);
  } else {
    send();
  }
};

async function screenshotToChat() {
  const attachment = await captureRegion(getScreenshotWindows);
  if (!attachment) return null;
  sendChatPrefill({ attachments: [attachment] });
  return attachment;
}

const createMainWindow = () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    title: 'DesktopFairy',
    width: 380,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.platform === 'darwin') {
    floatWindowOnAllSpaces(mainWindow);
  }

  loadURL(mainWindow);

  if (shouldOpenDevTools()) {
    mainWindow.webContents.openDevTools({ mode: getDevToolsMode() });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Window close = hide (not quit)
  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });

  // Rebuild menus when visibility changes
  mainWindow.on('show', () => refreshMenus());
  mainWindow.on('hide', () => refreshMenus());

  // Re-assert float behavior after macOS Space moves or focus changes
  mainWindow.on('moved', () => {
    if (process.platform === 'darwin') floatWindowOnAllSpaces(mainWindow);
  });
  mainWindow.on('focus', () => {
    if (process.platform === 'darwin') floatWindowOnAllSpaces(mainWindow);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
};

// Tip window lifecycle is managed by electron/tipWindow.cjs (via selectionService)

// ── IPC handlers ──────────────────────────────────────────────────────────────

const setupIPC = () => {
  ipcMain.handle('reapply_window_float', async () => {
    if (mainWindow && !mainWindow.isDestroyed() && process.platform === 'darwin') {
      floatWindowOnAllSpaces(mainWindow);
    }
  });

  ipcMain.handle('show_main_window', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  ipcMain.handle('hide_main_window', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
    }
  });

  ipcMain.handle('toggle_click_through', async (_event, enabled) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setIgnoreMouseEvents(enabled);
    }
  });

  ipcMain.handle('open_settings_window', async () => {
    createChatWindow({ view: 'settings' });
  });
  ipcMain.handle('open_chat_window', async () => {
    createChatWindow({ view: 'chat' });
  });
  ipcMain.handle('quit_app', async () => app.quit());

  // Open chat window with prefilled text (legacy)
  ipcMain.handle('open_chat_with_text', async (_event, text) => {
    sendChatPrefill({ text, autoSend: false });
  });

  ipcMain.handle('open_chat_with_payload', async (_event, payload) => {
    sendChatPrefill(payload);
  });

  ipcMain.handle('settings:sync', async (_event, settings) => {
    try {
      fs.writeFileSync(SETTINGS_PATH(), JSON.stringify(settings, null, 2));
    } catch (e) {
      console.warn('Failed to persist settings:', e);
    }
    applySelectionSettings(settings);
    for (const win of [mainWindow, chatWindow]) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('settings:updated', settings);
      }
    }
  });

  registerLive2DHandlers({
    ipcMain,
    getMainWindow: () => mainWindow,
    modelsDir: MODELS_DIR,
    publicRoot: PUBLIC_ROOT,
    settingsPath: SETTINGS_PATH,
  });

  registerChatSessionHandlers({
    ipcMain,
    sessionPath: CHAT_SESSION_PATH,
  });

  ipcMain.handle('selection:copy', async (_event, text) => {
    clipboard.writeText(String(text || ''));
  });

  ipcMain.handle('selection:open_url', async (_event, url) => {
    if (url) await shell.openExternal(String(url));
  });

  ipcMain.handle('selection:resize_tip', async (event, { width, height }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      const w = Math.max(1, Math.ceil(width));
      const h = Math.max(1, Math.ceil(height));
      win.setSize(w, h, true);
      if (!win.isVisible()) win.showInactive();
    }
  });

  ipcMain.handle('resize_main_window', async (_event, { width, height }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setSize(Math.round(width), Math.round(height), true);
      mainWindow.webContents.send('main-window:layout-changed');
    }
  });

  ipcMain.handle('window:get_size', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const [width, height] = mainWindow.getSize();
      return { width, height };
    }
    return null;
  });

  ipcMain.handle('window:set_size', async (_event, { width, height }) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setSize(width, height, true);
  });

  ipcMain.handle('window:get_position', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const [x, y] = mainWindow.getPosition();
      return { x, y };
    }
    return null;
  });

  ipcMain.handle('window:set_position', async (_event, { x, y }) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setPosition(x, y);
  });

  // Global cursor position for Live2D head tracking
  ipcMain.handle('screen:get_cursor_point', async () => {
    const point = screen.getCursorScreenPoint();
    return { x: point.x, y: point.y };
  });

  // Get/set global shortcut for selection assist
  ipcMain.handle('get_shortcut', async () => {
    const disk = loadSettingsFromDisk();
    return disk?.selectionShortcut || currentShortcut;
  });

  ipcMain.handle('set_shortcut', async (_event, shortcut) => {
    const disk = loadSettingsFromDisk() || {};
    const settings = { ...disk, selectionShortcut: shortcut };
    const result = selectionService.applySelectionSettings(settings, selectionDeps());
    if (result.shortcutRegistered) {
      currentShortcut = shortcut;
    }
    return result.shortcutRegistered;
  });

  ipcMain.handle('selection:check_accessibility', async () =>
    selectionService.getAccessibilityStatus()
  );

  ipcMain.handle('selection:prompt_accessibility', async () =>
    selectionService.promptAccessibility()
  );

  // ── Chat completion (OpenAI-compatible, streaming) ──────────────────────────

  const getChatCompletionsUrl = (apiHost, providerType) => {
    const trimmed = String(apiHost || '').replace(/\/$/, '');
    if (!trimmed) return '';
    if (providerType === 'ollama') {
      const base = trimmed.replace(/\/v1$/, '').replace(/\/api$/, '');
      return `${base}/v1/chat/completions`;
    }
    const base = trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
    return `${base}/chat/completions`;
  };

  ipcMain.handle('chat:check', async (_event, payload) => {
    const { apiHost, apiKey, providerType, model, timeoutMs } = payload || {};
    if (!apiHost) throw new Error('请填写 API Host');
    if (!model) throw new Error('请选择或添加模型');
    if (providerType === 'openai' && !apiKey) throw new Error('请填写 API Key');

    const url = getChatCompletionsUrl(apiHost, providerType);
    if (!url) throw new Error('API Host 无效');

    const controller = new AbortController();
    const timeout = typeof timeoutMs === 'number' ? timeoutMs : 15000;
    const timer = setTimeout(() => controller.abort(), timeout);
    const start = Date.now();

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
      }

      await res.json();
      return { ok: true, latencyMs: Date.now() - start, model };
    } catch (e) {
      if (e?.name === 'AbortError') {
        throw new Error(`检测超时（${timeout / 1000}s）`);
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  });

  ipcMain.handle('chat:send', async (event, payload) => {
    const { requestId, messages, chatUrl, apiBaseUrl, apiKey, model, temperature } = payload || {};
    const url = chatUrl || (apiBaseUrl ? `${String(apiBaseUrl).replace(/\/$/, '')}/chat/completions` : '');
    if (!requestId || !url || !model || !Array.isArray(messages)) {
      throw new Error('chat:send invalid payload');
    }
    const controller = new AbortController();
    inflightChats.set(requestId, controller);
    const sender = event.sender;
    const safeSend = (channel, data) => {
      try {
        if (!sender.isDestroyed()) sender.send(channel, data);
      } catch { /* receiver gone */ }
    };

    const body = { model, messages, stream: true };
    if (typeof temperature === 'number') body.temperature = temperature;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
      }
      if (!res.body) throw new Error('Empty response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      // Process SSE: lines like `data: {json}` separated by blank lines; `data: [DONE]` terminates.
      streamLoop: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nlIdx;
        while ((nlIdx = buf.indexOf('\n')) >= 0) {
          let line = buf.slice(0, nlIdx);
          buf = buf.slice(nlIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line) continue;
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data) continue;
          if (data === '[DONE]') break streamLoop;
          try {
            const json = JSON.parse(data);
            const delta = json?.choices?.[0]?.delta?.content;
            if (delta) safeSend('chat:stream:chunk', { requestId, delta });
          } catch {
            // Ignore malformed JSON line; keep streaming
          }
        }
      }

      safeSend('chat:stream:done', { requestId });
    } catch (e) {
      if (e && e.name === 'AbortError') {
        safeSend('chat:stream:done', { requestId, aborted: true });
      } else {
        safeSend('chat:stream:error', { requestId, message: String(e?.message || e) });
      }
    } finally {
      inflightChats.delete(requestId);
    }
  });

  ipcMain.handle('chat:abort', async (_event, payload) => {
    const requestId = payload?.requestId;
    const controller = requestId ? inflightChats.get(requestId) : null;
    if (controller) controller.abort();
  });

  ipcMain.handle('chat:list_models', async (_event, payload) => {
    const { apiHost, apiBaseUrl, apiKey, providerType } = payload || {};
    const host = apiHost || apiBaseUrl;
    if (!host) throw new Error('apiHost required');

    if (providerType === 'ollama') {
      const base = String(host).replace(/\/$/, '').replace(/\/v1$/, '').replace(/\/api$/, '');
      const res = await fetch(`${base}/api/tags`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      const json = await res.json();
      return (Array.isArray(json?.models) ? json.models : [])
        .map((m) => (typeof m === 'string' ? m : m?.name))
        .filter(Boolean);
    }

    const trimmed = String(host).replace(/\/$/, '');
    const base = trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
    const res = await fetch(`${base}/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : Array.isArray(json?.models) ? json.models : [];
    return list
      .map((m) => (typeof m === 'string' ? m : m?.id || m?.name))
      .filter(Boolean);
  });

  registerFileHandlers(ipcMain);
  registerScreenshotHandlers(ipcMain, {
    getWindows: getScreenshotWindows,
    captureToChat: sendChatPrefill,
  });
};

// ── Menu helpers ──────────────────────────────────────────────────────────────

const toggleMainWindow = () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isVisible()) mainWindow.hide();
  else mainWindow.show() || mainWindow.focus();
};

// Rebuild both app menu and tray menu with the correct toggle label.
// Electron MenuItem.label changes don't refresh the displayed menu on macOS,
// so we must rebuild the entire menu each time.
const refreshMenus = () => {
  const visible = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible();
  const toggleLabel = visible ? '隐藏模型' : '显示模型';

  // App menu bar
  const appMenu = Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        { label: '设置', click: () => createChatWindow({ view: 'settings' }) },
        { label: '截图', click: () => { screenshotToChat().catch((e) => console.error('[screenshot]', e)); } },
        { type: 'separator' },
        { label: toggleLabel, click: toggleMainWindow },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
  ]);
  Menu.setApplicationMenu(appMenu);

  // Tray context menu
  if (tray && !tray.isDestroyed()) {
    const contextMenu = Menu.buildFromTemplate([
      { label: '设置', click: () => createChatWindow({ view: 'settings' }) },
      { label: '截图', click: () => { screenshotToChat().catch((e) => console.error('[screenshot]', e)); } },
      { label: toggleLabel, click: toggleMainWindow },
      { type: 'separator' },
      { label: '退出', click: () => app.quit() },
    ]);
    tray.setContextMenu(contextMenu);
  }
};

// ── Tray ──────────────────────────────────────────────────────────────────────

const setupTray = () => {
  destroyTray();
  try {
    const icon = getTrayIcon();
    if (icon.isEmpty()) {
      console.error('[tray] icon is empty, path:', TRAY_ICON_PATH());
      return null;
    }
    tray = process.platform === 'darwin'
      ? new Tray(icon, TRAY_GUID)
      : new Tray(icon);
    tray.setToolTip('DesktopFairy');
    if (process.platform === 'darwin') {
      // Text label stays visible when tiny template icons are hidden by macOS.
      tray.setTitle('Fairy');
    }
    tray.on('click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isVisible()) mainWindow.focus();
        else mainWindow.show();
      }
    });
    refreshMenus();
    return tray;
  } catch (err) {
    console.error('[tray] failed to create:', err);
    return null;
  }
};

// ── Tray ──────────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  registerLive2DProtocol();
  // Tray must be registered before hiding Dock, or macOS may omit the status item.
  setupTray();
  hideMacDock();
  if (process.platform === 'darwin') {
    setTimeout(() => {
      setupTray();
      hideMacDock();
    }, 800);
    screen.on('display-added', scheduleTrayRefresh);
    screen.on('display-removed', scheduleTrayRefresh);
    screen.on('display-metrics-changed', scheduleTrayRefresh);
  }
  createMainWindow();
  setupIPC();
  refreshMenus();

  const diskSettings = loadSettingsFromDisk();
  if (diskSettings) {
    applySelectionSettings(diskSettings);
    currentShortcut = diskSettings.selectionShortcut || currentShortcut;
  }

  // Dock icon click → re-show main window
  app.on('activate', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
  });
});

// On macOS, don't quit when all windows are closed (stay in tray)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  selectionService.stopAll();
  globalShortcut.unregisterAll();
  for (const controller of inflightChats.values()) {
    controller.abort();
  }
  inflightChats.clear();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeAllListeners('close');
    mainWindow.close();
  }
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.removeAllListeners('close');
    chatWindow.close();
  }
  if (tray) {
    destroyTray();
  }
});
