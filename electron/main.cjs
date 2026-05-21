const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');

// Dev server URL (Vite)
const DEV_SERVER_URL = 'http://localhost:5173';
// Production: load from built files
const PROD_INDEX_PATH = path.join(__dirname, '../dist/index.html');

const isDev = !app.isPackaged;

let mainWindow = null;
let settingsWindow = null;
let chatWindow = null;
let tray = null;

const TRAY_SVG_PATH = path.join(__dirname, '../public/favicon.svg');

// Fallback: 22x22 black circle PNG (template image, adapts to dark/light mode)
const FALLBACK_TRAY_ICON_B64 = 'iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAAN0lEQVR42mNgGAUkgP84MNUNpMiC/yRimhhKtOE0Mfg/hXjU4OFo8NBLxzTN0jQthGhabI4wAABTx88xx8vz5QAAAABJRU5ErkJggg==';

const getTrayIcon = () => {
  // On macOS 12+, NSImage (used internally by Electron) supports SVG directly.
  const img = nativeImage.createFromPath(TRAY_SVG_PATH);
  if (!img.isEmpty()) {
    return img.resize({ width: 22, height: 22 });
  }
  // Fallback: embedded black circle PNG with template mode (adapts to dark/light menu bar).
  const fallback = nativeImage.createFromDataURL('data:image/png;base64,' + FALLBACK_TRAY_ICON_B64);
  fallback.setTemplateImage(true);
  return fallback;
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

const createSettingsWindow = () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return settingsWindow;
  }

  settingsWindow = new BrowserWindow({
    title: '设置',
    width: 480,
    height: 600,
    resizable: false,
    center: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  loadURL(settingsWindow, '?window=settings');
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  return settingsWindow;
};

const createChatWindow = () => {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.show();
    chatWindow.focus();
    return chatWindow;
  }

  chatWindow = new BrowserWindow({
    title: '聊天',
    width: 420,
    height: 600,
    resizable: true,
    center: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  loadURL(chatWindow, '?window=chat');
  chatWindow.on('closed', () => {
    chatWindow = null;
  });

  return chatWindow;
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

  ipcMain.handle('open_settings_window', async () => createSettingsWindow());
  ipcMain.handle('open_chat_window', async () => createChatWindow());
  ipcMain.handle('quit_app', async () => app.quit());

  ipcMain.handle('resize_main_window', async (_event, { width, height }) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setSize(width, height, true);
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
  const toggleLabel = visible ? '隐藏' : '显示';

  // App menu bar
  const appMenu = Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        { label: '设置', click: () => createSettingsWindow() },
        { type: 'separator' },
        { label: toggleLabel, click: toggleMainWindow },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
  ]);
  Menu.setApplicationMenu(appMenu);

  // Tray context menu
  if (tray && !tray.isDestroyed()) {
    const contextMenu = Menu.buildFromTemplate([
      { label: '设置', click: () => createSettingsWindow() },
      { label: toggleLabel, click: toggleMainWindow },
      { type: 'separator' },
      { label: '退出', click: () => app.quit() },
    ]);
    tray.setContextMenu(contextMenu);
  }
};

// ── Tray ──────────────────────────────────────────────────────────────────────

const setupTray = () => {
  const icon = getTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('Desktop Assistant');
  refreshMenus();
};

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Hide dock before Tray creation → NSApplicationActivationPolicyAccessory
  if (process.platform === 'darwin') {
    app.dock.hide();
  }
  createMainWindow();
  setupIPC();
  setupTray();
  refreshMenus();

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
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeAllListeners('close');
    mainWindow.close();
  }
  if (tray) {
    tray.destroy();
    tray = null;
  }
});
