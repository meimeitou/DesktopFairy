const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, globalShortcut, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');

/** Dev + DMG share one settings dir (matches package.json name). Must run before app.ready. */
const USER_DATA_DIR = path.join(app.getPath('appData'), 'desktop-fairy');
app.setPath('userData', USER_DATA_DIR);

const selectionService = require('./selectionService.cjs');
const chatShortcutService = require('./chatShortcutService.cjs');
const tipWindow = require('./tipWindow.cjs');
const { isOverlayElevated } = require('./tipWindowMacPolicy.cjs');
const { registerFileHandlers } = require('./fileService.cjs');
const { registerScreenshotHandlers, captureRegion, screenshotCopyText, isOcrAvailable } = require('./screenshotService.cjs');
const {
  registerLive2DSchemes,
  registerLive2DProtocol,
  registerLive2DHandlers,
  pushLive2DBubble,
} = require('./live2dService.cjs');
const { registerChatSessionHandlers } = require('./chatSessionService.cjs');
const { registerPtyHandlers, killAllSessions, killSessionsForSender } = require('./ptyService.cjs');
const { registerSshHandlers, killAllSshSessions } = require('./sshService.cjs');
const { registerAgentSkillHandlers } = require('./agentSkillService.cjs');
const { registerAgentHandlers, abortAllAgentRuns } = require('./agentService.cjs');
const { registerAiStreamHandlers, abortAllAiStreams } = require('./aiStreamService.cjs');
const { registerToolApprovalHandlers } = require('./agentToolApproval.cjs');
const { registerMcpServerHandlers } = require('./mcpServerService.cjs');
const { registerMcpRuntimeHandlers, disposeAll: disposeAllMcpClients } = require('./mcpRuntimeService.cjs');
const { registerAgentAvatarHandlers } = require('./agentAvatarService.cjs');
const { installBuiltinSkills } = require('./builtinSkills.cjs');
const {
  resolveChatWindowPosition,
  presentChatWindow,
  hideChatWindow,
  attachChatToAllSpaces,
  detachChatFromAllSpaces,
} = require('./chatWindowPosition.cjs');
const {
  attachWindowOpenHandler,
  registerBrowserHandlers,
} = require('./browserService.cjs');
const { createCodeProjectService } = require('./codeProjectService.cjs');
const { registerCodeCliHandlers } = require('./codeCliService.cjs');
const settingsSnapshot = require('./settingsSnapshot.cjs');

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
let currentChatShortcut = 'Command+R'; // mirrored for get_chat_shortcut IPC
let modelHiddenByUser = false; // set when user hides the model via the menu toggle

const selectionDeps = () => ({
  loadURL,
  isDev,
});

const chatShortcutDeps = () => ({
  toggle: () => togglePresence(),
});

const applySelectionSettings = (settings) => {
  const result = selectionService.applySelectionSettings(settings, selectionDeps());
  if (settings?.selectionShortcut) {
    currentShortcut = settings.selectionShortcut;
  }
  return result;
};

const applyChatShortcutSettings = (settings) => {
  const ok = chatShortcutService.applyChatShortcutSettings(settings, chatShortcutDeps());
  if (settings?.chatShortcut) {
    currentChatShortcut = settings.chatShortcut;
  }
  return ok;
};

const SETTINGS_PATH = () => path.join(app.getPath('userData'), 'da_settings.json');
const CHAT_SESSION_PATH = () => path.join(app.getPath('userData'), 'da_chat.json');
const CHAT_TOPICS_INDEX_PATH = () => path.join(app.getPath('userData'), 'da_chat_topics.json');
const CHAT_SESSIONS_DIR = () => path.join(app.getPath('userData'), 'chat_sessions');
const CHAT_TOOL_RESULTS_DIR = () => path.join(app.getPath('userData'), 'chat_tool_results');
const CHAT_LOGS_DIR = () => path.join(app.getPath('userData'), 'chat_session_logs');
const CODE_PROJECTS_STORE_PATH = () => path.join(app.getPath('userData'), 'da_code_projects.json');

/** @type {ReturnType<createCodeProjectService> | null} */
let codeProjectService = null;

const loadSettingsFromDisk = () => {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH(), 'utf8'));
  } catch {
    return null;
  }
};

/** Startup defaults — keep in sync with src/shared/settings.ts DEFAULT_SETTINGS */
const DEFAULT_SELECTION_SETTINGS = {
  selectionEnabled: true,
  selectionTriggerMode: 'shortcut',
  selectionShortcut: 'Command+Shift+C',
  selectionMaxLength: 500,
  chatShortcut: 'Command+R',
};

const resolveStartupSettings = () => ({
  ...DEFAULT_SELECTION_SETTINGS,
  ...(loadSettingsFromDisk() || {}),
});

// Seed main-process snapshot so early sends resolve without waiting for renderer sync.
{
  const disk = loadSettingsFromDisk();
  if (disk) settingsSnapshot.setSnapshot(disk);
}


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
  // Keep regular activation while selection tip floats over external apps.
  if (isOverlayElevated() || tipWindow.isVisible()) return;
  app.setActivationPolicy('accessory');
  if (app.dock?.hide) app.dock.hide();
};

const presentChatWindowOnMac = (screen, mainWindow, chatWindow, refPoint, options = {}) => {
  presentChatWindow(screen, mainWindow, chatWindow, refPoint, {
    ...options,
    showMain: !modelHiddenByUser,
  });
  hideMacDock();
};

const dismissChatWindow = (win) => {
  hideChatWindow(win);
  hideMacDock();
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
  const query = queryString
    ? queryString.startsWith('?')
      ? queryString
      : `?${queryString}`
    : '';
  if (isDev) {
    win.loadURL(`${DEV_SERVER_URL}/index.html${query}`);
  } else {
    win.loadFile(PROD_INDEX_PATH, {
      query: queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {},
    });
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

const sendCodeAction = (win, action) => {
  if (!win || win.isDestroyed()) return;
  const send = () => win.webContents.send('code:action', action);
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', send);
  } else {
    send();
  }
};

const openCodeView = (action = null) => {
  const win = createChatWindow({ view: 'code' });
  if (action) sendCodeAction(win, action);
  return win;
};

const activateProjectAndOpenCode = (projectId) => {
  if (codeProjectService) {
    const store = codeProjectService.readStore();
    const project = store.projects.find((p) => p.id === projectId);
    if (project) {
      store.activeProjectId = projectId;
      project.lastOpenedAt = Date.now();
      codeProjectService.writeStore(store);
    }
  }
  openCodeView(null);
};

const buildProjectListSubmenu = () => {
  const store = codeProjectService?.readStore?.() ?? { projects: [] };
  if (!store.projects.length) {
    return [{ label: '（无项目）', enabled: false }];
  }
  return store.projects.map((project) => ({
    label: project.name,
    click: () => activateProjectAndOpenCode(project.id),
  }));
};

const getSelectionChatAnchor = () => {
  const bounds = tipWindow.getBounds();
  if (bounds) {
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
  }
  return screen.getCursorScreenPoint();
};

const isTipWebContents = (webContents) => {
  if (!webContents || webContents.isDestroyed()) return false;
  try {
    const url = new URL(webContents.getURL());
    return url.searchParams.get('window') === 'tip';
  } catch {
    return false;
  }
};

const createChatWindow = (options = {}) => {
  const {
    view = null,
    refPoint = screen.getCursorScreenPoint(),
    anchor = 'main',
  } = options;
  const positionOptions = { anchor };

  if (chatWindow && !chatWindow.isDestroyed()) {
    presentChatWindowOnMac(screen, mainWindow, chatWindow, refPoint, positionOptions);
    if (view) navigateChatWindow(chatWindow, view);
    return chatWindow;
  }

  const initialPos = resolveChatWindowPosition(
    screen,
    mainWindow,
    null,
    refPoint,
    positionOptions
  );

  chatWindow = new BrowserWindow({
    title: ' ',
    width: 853,
    height: 520,
    minWidth: 640,
    minHeight: 520,
    x: initialPos.x,
    y: initialPos.y,
    resizable: true,
    fullscreenable: false,
    center: false,
    show: false,
    skipTaskbar: true,
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

  const viewSuffix =
    view === 'settings'
      ? 'view=settings'
      : view === 'terminal'
        ? 'view=terminal'
        : view === 'code'
          ? 'view=code'
          : '';
  const query = viewSuffix ? `?window=chat&${viewSuffix}` : '?window=chat';
  loadURL(chatWindow, query);

  chatWindow.once('ready-to-show', () => {
    if (!chatWindow || chatWindow.isDestroyed()) return;
    presentChatWindowOnMac(screen, mainWindow, chatWindow, refPoint, positionOptions);
  });

  chatWindow.on('close', (e) => {
    if (!isQuitting) {
      // When in native fullscreen on macOS, intercepting close can deadlock the
      // window manager. Let the first close exit fullscreen; the next close hides.
      if (!chatWindow.isFullScreen()) {
        e.preventDefault();
        dismissChatWindow(chatWindow);
      }
    }
  });

  chatWindow.on('hide', () => {
    hideMacDock();
  });

  // Sync fullscreen/maximized state to renderer so the custom title bar can
  // adjust its traffic-light padding (same pattern as cherry-studio).
  chatWindow.on('enter-full-screen', () => {
    if (chatWindow.isDestroyed()) return;
    detachChatFromAllSpaces(chatWindow);
    chatWindow.webContents.send('chat:window:fullscreen_changed', true);
  });

  chatWindow.on('leave-full-screen', () => {
    if (chatWindow.isDestroyed()) return;
    attachChatToAllSpaces(chatWindow);
    chatWindow.webContents.send('chat:window:fullscreen_changed', false);
  });

  chatWindow.on('maximize', () => {
    if (chatWindow.isDestroyed()) return;
    chatWindow.webContents.send('chat:window:maximized_changed', true);
  });

  chatWindow.on('unmaximize', () => {
    if (chatWindow.isDestroyed()) return;
    chatWindow.webContents.send('chat:window:maximized_changed', false);
  });

  // Minimizing from fullscreen/maximized can deadlock on macOS panel windows.
  // Drop out of fullscreen first, then minimize.
  chatWindow.on('minimize', () => {
    if (chatWindow.isDestroyed()) return;
    if (chatWindow.isFullScreen()) {
      chatWindow.setFullScreen(false);
    }
  });

  chatWindow.on('closed', () => {
    // It's possible for the 'closed' event to fire after the reference has been nulled
    // out by another part of the shutdown sequence.
    if (chatWindow && !chatWindow.isDestroyed()) {
      killSessionsForSender(chatWindow.webContents);
    }
    chatWindow = null;
  });

  return chatWindow;
};

const getScreenshotWindows = () => [mainWindow, chatWindow];

const SPEECH_BUBBLE_COPY_OK = '已帮主人复制~';
const SPEECH_BUBBLE_COPY_FAIL = '没有可以复制的东西呢～';

function deliverLive2DBubble(text) {
  pushLive2DBubble(
    () => mainWindow,
    { text: String(text || ''), source: 'system' },
    { showWindow: true, delayMs: 300 }
  );
}

function notifyScreenshotCopyBubble(success) {
  deliverLive2DBubble(success ? SPEECH_BUBBLE_COPY_OK : SPEECH_BUBBLE_COPY_FAIL);
}

const sendChatPrefill = (payload, options = {}) => {
  const fromSelection = options.fromSelection === true;
  const win = createChatWindow({
    view: 'chat',
    anchor: fromSelection ? 'cursor' : 'main',
    refPoint: fromSelection ? getSelectionChatAnchor() : screen.getCursorScreenPoint(),
  });
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
  if (chatWindow && !chatWindow.isDestroyed() && chatWindow.isVisible()) {
    presentChatWindowOnMac(screen, mainWindow, chatWindow, screen.getCursorScreenPoint());
  }
  if (!attachment) return null;
  sendChatPrefill({ attachments: [attachment] });
  return attachment;
}

async function screenshotCopyTextHandler() {
  try {
    const text = await screenshotCopyText(getScreenshotWindows);
    notifyScreenshotCopyBubble(!!text);
  } catch (e) {
    console.error('[screenshot:copy_text]', e);
    notifyScreenshotCopyBubble(false);
  }
}

const screenshotMenuItems = () => {
  const items = [];
  if (process.platform === 'darwin' && isOcrAvailable()) {
    items.push({ label: '截图复制', click: screenshotCopyTextHandler });
  }
  items.push({
    label: '截图询问',
    click: () => {
      screenshotToChat().catch((e) => console.error('[screenshot]', e));
    },
  });
  return items;
};

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
    fullscreenable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
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
    if (process.platform === 'darwin' && !mainWindow.isFullScreen()) {
      floatWindowOnAllSpaces(mainWindow);
    }
  });
  mainWindow.on('focus', () => {
    if (process.platform === 'darwin' && !mainWindow.isFullScreen()) {
      floatWindowOnAllSpaces(mainWindow);
      hideMacDock();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
};

// Tip window lifecycle is managed by electron/tipWindow.cjs (via selectionService)

// ── IPC handlers ──────────────────────────────────────────────────────────────

const setupIPC = () => {
  // Synchronous settings load — used by renderer as localStorage fallback
  ipcMain.on('settings:load:sync', (event) => {
    try {
      event.returnValue = fs.readFileSync(SETTINGS_PATH(), 'utf8');
    } catch {
      event.returnValue = null;
    }
  });

  ipcMain.handle('reapply_window_float', async () => {
    if (mainWindow && !mainWindow.isDestroyed() && process.platform === 'darwin' && !mainWindow.isFullScreen()) {
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
    createChatWindow();
  });
  ipcMain.handle('quit_app', async () => app.quit());

  // Open chat window with prefilled text (legacy)
  ipcMain.handle('open_chat_with_text', async (_event, text) => {
    sendChatPrefill({ text, autoSend: false });
  });

  ipcMain.handle('open_chat_with_payload', async (event, payload) => {
    sendChatPrefill(payload, {
      fromSelection: isTipWebContents(event.sender),
    });
  });

  ipcMain.handle('settings:sync', async (event, settings) => {
    // Persist to disk. A write failure is surfaced to the renderer via the
    // return value so it can alert the user — previously it was silently
    // swallowed and the renderer assumed success (data loss on restart).
    let persisted = true;
    let error;
    try {
      fs.writeFileSync(SETTINGS_PATH(), JSON.stringify(settings, null, 2));
    } catch (e) {
      persisted = false;
      error = e && e.message ? String(e.message) : String(e);
      console.warn('Failed to persist settings:', e);
    }
    // Apply in-memory + broadcast even on disk failure so the running session
    // stays consistent; only the on-disk copy is stale.
    const revision = settingsSnapshot.setSnapshot(settings);
    applySelectionSettings(settings);
    applyChatShortcutSettings(settings);
    // Broadcast to every window, including the sender. Chat / Settings / Code /
    // Terminal share one BrowserWindow (keep-alive tabs); skipping the sender
    // left ChatPage / CodeCliPanel stuck on stale provider model lists.
    const payload = { settings, revision };
    for (const win of [mainWindow, chatWindow]) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('settings:updated', payload);
      }
    }
    return { persisted, error, revision };
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
    topicsIndexPath: CHAT_TOPICS_INDEX_PATH,
    sessionsDir: CHAT_SESSIONS_DIR,
    toolResultsDir: CHAT_TOOL_RESULTS_DIR,
    chatLogsDir: CHAT_LOGS_DIR,
  });

  codeProjectService = createCodeProjectService({ storePath: CODE_PROJECTS_STORE_PATH });
  codeProjectService.registerHandlers(ipcMain);
  registerCodeCliHandlers({ ipcMain });

  registerPtyHandlers({ ipcMain });

  registerSshHandlers({ ipcMain });

  registerAgentSkillHandlers(ipcMain);
  registerMcpServerHandlers(ipcMain);
  registerMcpRuntimeHandlers(ipcMain);
  registerAgentAvatarHandlers(ipcMain);
  registerToolApprovalHandlers(ipcMain);
  registerAgentHandlers(ipcMain, {
    getWindows: getScreenshotWindows,
    chatLogsDir: CHAT_LOGS_DIR,
    getParentWindow: () => {
      if (chatWindow && !chatWindow.isDestroyed()) return chatWindow;
      if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
      return null;
    },
  });
  registerAiStreamHandlers(ipcMain, {
    getWindows: getScreenshotWindows,
    getParentWindow: () => {
      if (chatWindow && !chatWindow.isDestroyed()) return chatWindow;
      if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
      return null;
    },
  });

  registerBrowserHandlers(ipcMain, {
    loadURL,
    shouldOpenDevTools,
    getDevToolsMode,
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
      const w = Math.max(80, Math.ceil(width));
      const h = Math.max(36, Math.ceil(height));
      win.setSize(w, h, true);
    }
  });

  ipcMain.handle('selection:hide_tip', async () => {
    selectionService.hideTip();
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
    const settings = resolveStartupSettings();
    settings.selectionShortcut = shortcut;
    try {
      fs.writeFileSync(SETTINGS_PATH(), JSON.stringify(settings, null, 2));
    } catch (e) {
      console.warn('Failed to persist shortcut:', e);
    }
    const result = selectionService.applySelectionSettings(settings, selectionDeps());
    if (result.shortcutRegistered) {
      currentShortcut = shortcut;
    }
    return result.shortcutRegistered;
  });

  // Get/set global shortcut that opens the chat window
  ipcMain.handle('get_chat_shortcut', async () => {
    const disk = loadSettingsFromDisk();
    return disk?.chatShortcut || currentChatShortcut;
  });

  ipcMain.handle('set_chat_shortcut', async (_event, shortcut) => {
    const settings = resolveStartupSettings();
    settings.chatShortcut = shortcut;
    try {
      fs.writeFileSync(SETTINGS_PATH(), JSON.stringify(settings, null, 2));
    } catch (e) {
      console.warn('Failed to persist chat shortcut:', e);
    }
    const ok = applyChatShortcutSettings(settings);
    if (ok) {
      currentChatShortcut = shortcut;
    }
    return ok;
  });

  ipcMain.handle('selection:check_accessibility', async () => ({
    ...selectionService.getAccessibilityStatus(),
    userDataPath: app.getPath('userData'),
    settingsPath: SETTINGS_PATH(),
  }));

  ipcMain.handle('selection:prompt_accessibility', async () => {
    const granted = selectionService.promptAccessibility();
    if (granted) {
      selectionService.reinitAfterAccessibilityGrant(
        resolveStartupSettings(),
        selectionDeps()
      );
    }
    return granted;
  });

  ipcMain.handle('selection:retry_hook', async () => {
    const status = selectionService.getAccessibilityStatus();
    if (!status.trusted) {
      return { ...status, restarted: false, reason: 'not_trusted' };
    }
    const result = selectionService.reinitAfterAccessibilityGrant(
      resolveStartupSettings(),
      selectionDeps()
    );
    return { ...result, restarted: true };
  });

  // ── Chat completion (OpenAI-compatible, streaming) ──────────────────────────

  // 仅允许 http/https：防止 file:/data: 等非预期 scheme 经渲染进程配置外泄。
  function assertHttpUrl(raw) {
    let u;
    try { u = new URL(String(raw)); } catch { throw new Error('URL 无效'); }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new Error(`不支持的协议: ${u.protocol}（仅允许 http/https）`);
    }
    return u.href;
  }

  ipcMain.handle('chat:check', async (_event, payload) => {
    const { apiHost, apiKey, providerType, providerId, model, timeoutMs } = payload || {};
    if (!apiHost) throw new Error('请填写 API Host');
    if (!model) throw new Error('请选择或添加模型');
    const needsKey =
      providerType !== 'ollama' && providerId !== 'hermes';
    if (needsKey && !apiKey) throw new Error('请填写 API Key');

    assertHttpUrl(apiHost);

    const { checkConnection } = require('./ai/AiService.cjs');
    const controller = new AbortController();
    const timeout = typeof timeoutMs === 'number' ? timeoutMs : 15000;
    const timer = setTimeout(() => controller.abort(), timeout);
    const start = Date.now();

    try {
      await checkConnection({
        apiConfig: {
          apiHost,
          apiKey,
          providerType,
          modelName: model,
        },
        signal: controller.signal,
      });
      return { ok: true, latencyMs: Date.now() - start, model };
    } catch (e) {
      if (e?.name === 'AbortError' || controller.signal.aborted) {
        throw new Error(`检测超时（${timeout / 1000}s）`);
      }
      const status = e?.statusCode != null ? `HTTP ${e.statusCode}` : '';
      const url = typeof e?.url === 'string' ? e.url : '';
      const body =
        typeof e?.responseBody === 'string'
          ? e.responseBody.slice(0, 200)
          : '';
      const detail = [status, url, body || e?.message || e]
        .filter(Boolean)
        .join(' · ');
      throw new Error(`连接失败：${detail}`);
    } finally {
      clearTimeout(timer);
    }
  });

  ipcMain.handle('chat:send', async (event, payload) => {
    const { requestId, messages } = payload || {};
    if (!requestId || !Array.isArray(messages)) {
      throw new Error('chat:send invalid payload');
    }

    // Authoritative resolve from main snapshot (ignore stale renderer apiConfig).
    const resolved = settingsSnapshot.resolveForSend({
      apiConfig: payload?.apiConfig,
      forceAgent: false,
    });
    if (!resolved.ok || !resolved.apiConfig) {
      throw new Error(resolved.error || 'chat:send invalid apiConfig');
    }
    if (settingsSnapshot.isAgentBackend(resolved.backend)) {
      throw new Error('chat:send does not support agent backend; use ai:stream_open');
    }
    assertHttpUrl(resolved.apiConfig.apiHost);

    const { streamPlainText } = require('./ai/AiService.cjs');
    const controller = new AbortController();
    inflightChats.set(requestId, controller);
    const sender = event.sender;
    const safeSend = (channel, data) => {
      try {
        if (!sender.isDestroyed()) sender.send(channel, data);
      } catch { /* receiver gone */ }
    };

    try {
      const { aborted } = await streamPlainText({
        requestId,
        messages,
        apiConfig: resolved.apiConfig,
        signal: controller.signal,
        safeSend,
      });
      safeSend('chat:stream:done', { requestId, aborted: Boolean(aborted) });
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
    assertHttpUrl(host);

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

    if (providerType === 'anthropic') {
      const base = String(host).replace(/\/$/, '').replace(/\/v1$/, '');
      try {
        const res = await fetch(`${base}/v1/models`, {
          headers: {
            'x-api-key': apiKey || '',
            'anthropic-version': '2023-06-01',
          },
        });
        if (!res.ok) return [];
        const json = await res.json();
        const list = Array.isArray(json?.data) ? json.data : Array.isArray(json?.models) ? json.models : [];
        return list
          .map((m) => (typeof m === 'string' ? m : m?.id || m?.name))
          .filter(Boolean);
      } catch {
        return [];
      }
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
    onScreenshotCopyText: notifyScreenshotCopyBubble,
  });
};

// ── Menu helpers ──────────────────────────────────────────────────────────────

const toggleMainWindow = () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
    modelHiddenByUser = true;
  } else {
    mainWindow.show();
    mainWindow.focus();
    modelHiddenByUser = false;
  }
};

// Toggle the chat window bound to the global chat shortcut (Cmd+R).
// The Live2D main window stays untouched (always visible unless hidden via menu).
const togglePresence = () => {
  if (chatWindow && !chatWindow.isDestroyed() && chatWindow.isVisible()) {
    dismissChatWindow(chatWindow);
  } else {
    createChatWindow({
      anchor: 'cursor',
      refPoint: screen.getCursorScreenPoint(),
    });
  }
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
        ...screenshotMenuItems(),
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
    {
      label: 'Code',
      submenu: [
        { label: '新建项目…', click: () => openCodeView('new-project') },
        { label: '打开项目…', click: () => openCodeView('open-project') },
        { label: '编辑项目…', click: () => openCodeView('edit-project') },
        { type: 'separator' },
        { label: '项目列表', submenu: buildProjectListSubmenu() },
      ],
    },
    {
      label: '窗口',
      submenu: [
        {
          label: '关闭窗口',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.close();
          },
        },
        { role: 'minimize', label: '最小化' },
      ],
    },
  ]);
  Menu.setApplicationMenu(appMenu);

  // Tray context menu
  if (tray && !tray.isDestroyed()) {
    const contextMenu = Menu.buildFromTemplate([
      { label: '设置', click: () => createChatWindow({ view: 'settings' }) },
      ...screenshotMenuItems(),
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
      if (!mainWindow || mainWindow.isDestroyed()) return;
      // 「隐藏/显示模型」仅由菜单项控制；托盘点击不擅自显示 app 窗口，
      // 避免用户「打开菜单就自动弹出模型」。窗口可见时仅聚焦置顶。
      if (mainWindow.isVisible()) mainWindow.focus();
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
  if (isDev && process.env.ELECTRON_HOT_RELOAD !== '0') {
    let reloadTimer = null;
    fs.watch(__dirname, { recursive: true }, (_evt, file) => {
      if (!file || !file.endsWith('.cjs')) return;
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        console.log(`[hot-reload] ${file} changed, restarting…`);
        app.relaunch();
        app.exit(0);
      }, 300);
    });
  }
  registerLive2DProtocol();
  // Tray must be registered before hiding Dock, or macOS may omit the status item.
  setupTray();
  hideMacDock();

  app.on('web-contents-created', (_event, contents) => {
    attachWindowOpenHandler(contents);
  });

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
  void installBuiltinSkills().catch((err) => {
    console.error('[builtin-skills] install failed:', err);
  });
  refreshMenus();

  const startupSettings = resolveStartupSettings();
  applySelectionSettings(startupSettings);
  currentShortcut = startupSettings.selectionShortcut || currentShortcut;
  applyChatShortcutSettings(startupSettings);
  currentChatShortcut = startupSettings.chatShortcut || currentChatShortcut;

  // After the renderer finishes loading, do a full cleanup restart so the hook
  // gets a brand-new native instance (same as toggle OFF→ON). This fixes the
  // "need to toggle once for selection to work" issue on first launch.
  mainWindow.webContents.once('did-finish-load', () => {
    selectionService.reinitAfterAccessibilityGrant(resolveStartupSettings(), selectionDeps());
  });

  // Packaged apps may grant Accessibility shortly after first launch — retry.
  if (!isDev) {
    setTimeout(() => {
      selectionService.reinitAfterAccessibilityGrant(resolveStartupSettings(), selectionDeps());
    }, 1500);
  }

  if (process.platform === 'darwin') {
    const maybeRestartSelection = () => {
      const settings = resolveStartupSettings();
      if (!settings.selectionEnabled) return;
      const status = selectionService.getAccessibilityStatus();
      if (!status.trusted || status.hookStarted) return;
      selectionService.reinitAfterAccessibilityGrant(settings, selectionDeps());
    };

    app.on('accessibility-support-changed', (_event, enabled) => {
      if (enabled) maybeRestartSelection();
    });

    app.on('did-become-active', () => {
      maybeRestartSelection();
    });

    // Accessory (LSUIElement) apps may not receive did-become-active reliably.
    if (app.isPackaged) {
      setInterval(() => {
        maybeRestartSelection();
      }, 4000);
    }
  }

  // Dock icon click → re-show main window (keep accessory / no Dock icon)
  app.on('activate', () => {
    hideMacDock();
    if (modelHiddenByUser) return;
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
  killAllSessions();
  killAllSshSessions();
  abortAllAgentRuns();
  abortAllAiStreams();
  disposeAllMcpClients();
  selectionService.stopAll();
  chatShortcutService.stopChatShortcut();
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
