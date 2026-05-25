const { BrowserWindow } = require('electron');
const { resolveRefPoint, calculateToolbarPosition } = require('./selectionPosition.cjs');

const EST_WIDTH = 320;
const EST_HEIGHT = 48;
const AUTO_CLOSE_MS = 8000;

let tipWindowRef = null;
let loadURLFn = null;
let closeTimer = null;
let SelectionHookRef = null;

function init(deps) {
  loadURLFn = deps.loadURL;
  SelectionHookRef = deps.SelectionHook;
}

function isAlive() {
  return tipWindowRef && !tipWindowRef.isDestroyed();
}

function isVisible() {
  return isAlive() && tipWindowRef.isVisible();
}

function getBounds() {
  return isAlive() ? tipWindowRef.getBounds() : null;
}

function hideTip() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  if (isVisible()) {
    tipWindowRef.hide();
  }
}

function ensureTipWindow() {
  if (isAlive()) return tipWindowRef;

  tipWindowRef = new BrowserWindow({
    width: 1,
    height: 1,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    resizable: false,
    show: false,
    hasShadow: false,
    thickFrame: false,
    webPreferences: {
      preload: require('path').join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  tipWindowRef.on('closed', () => {
    tipWindowRef = null;
  });

  return tipWindowRef;
}

function showTipMac(win, programName) {
  const isSelf =
    programName === 'com.github.Electron' ||
    programName === 'com.desktop.fairy' ||
    programName.includes('Electron');

  if (!isSelf) {
    win.setFocusable(false);
    win.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });
  }

  win.showInactive();
  win.setFocusable(true);
}

function showTip(text, selectionData) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return;

  const { refPoint, refOrientation } = resolveRefPoint(selectionData, SelectionHookRef);
  const { x, y } = calculateToolbarPosition(
    refPoint,
    refOrientation,
    EST_WIDTH,
    EST_HEIGHT
  );

  const win = ensureTipWindow();

  if (process.platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  win.setPosition(x, y, false);
  win.setAlwaysOnTop(true, 'screen-saver');
  loadURLFn(win, `?window=tip&text=${encodeURIComponent(trimmed)}`);

  if (process.platform === 'darwin') {
    showTipMac(win, selectionData?.programName || '');
  } else {
    win.showInactive();
  }

  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    if (isAlive()) win.close();
  }, AUTO_CLOSE_MS);
}

function destroyTipWindow() {
  hideTip();
  if (isAlive()) {
    tipWindowRef.close();
  }
  tipWindowRef = null;
}

module.exports = {
  init,
  showTip,
  hideTip,
  isAlive,
  isVisible,
  getBounds,
  destroyTipWindow,
};
