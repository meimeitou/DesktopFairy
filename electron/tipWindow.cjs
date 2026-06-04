const { BrowserWindow } = require('electron');
const { resolveRefPoint, calculateToolbarPosition } = require('./selectionPosition.cjs');
const {
  applyTipWindowBehavior,
  applyTipWindowQuirks,
  armBlurHideGrace,
  TIP_ALWAYS_ON_TOP,
} = require('./tipWindowQuirks.cjs');
const {
  elevateForSelectionOverlay,
  restoreAfterSelectionOverlay,
} = require('./tipWindowMacPolicy.cjs');
const { SELECTION_SELF_APP_MAC } = require('./selectionConfig.cjs');

const EST_WIDTH = 320;
const EST_HEIGHT = 48;
const AUTO_CLOSE_MS = 8000;
const TIP_IPC_CHANNEL = 'selection:tip_text';

let tipWindowRef = null;
let loadURLFn = null;
let closeTimer = null;
let SelectionHookRef = null;
let onShowCallback = null;
let onHideCallback = null;
let tipContentReady = null;
let tipContentLoaded = false;
let lastTipLoadError = null;
let lastExternalOverlay = false;

function isContentLoaded() {
  return tipContentLoaded;
}

function getLastTipError() {
  return lastTipLoadError;
}

function init(deps) {
  loadURLFn = deps.loadURL;
  SelectionHookRef = deps.SelectionHook;
}

function setOnShow(callback) {
  onShowCallback = callback;
}

function setOnHide(callback) {
  onHideCallback = callback;
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

/** True when point falls inside any of our UI windows (main/chat/settings), not the tip. */
function isPointInAppUi(point) {
  const px = Math.round(Number(point?.x));
  const py = Math.round(Number(point?.y));
  if (!Number.isFinite(px) || !Number.isFinite(py)) return false;

  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed() || !win.isVisible()) continue;
    if (tipWindowRef && win.id === tipWindowRef.id) continue;
    const b = win.getBounds();
    if (px >= b.x && px <= b.x + b.width && py >= b.y && py <= b.y + b.height) {
      return true;
    }
  }
  return false;
}

function isSelfProgram(programName) {
  const name = String(programName || '');
  if (!name) return false;
  return SELECTION_SELF_APP_MAC.some((token) =>
    token.endsWith('.') ? name.startsWith(token) : name === token || name.includes(token)
  );
}

function ensureTipWindow() {
  if (isAlive()) return tipWindowRef;

  tipWindowRef = new BrowserWindow({
    width: EST_WIDTH,
    height: EST_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    movable: true,
    hasShadow: false,
    thickFrame: false,
    roundedCorners: true,
    ...(process.platform === 'darwin'
      ? {
          type: 'panel',
          hiddenInMissionControl: true,
          acceptFirstMouse: true,
        }
      : { type: 'toolbar', focusable: false }),
    webPreferences: {
      preload: require('path').join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  applyTipWindowBehavior(tipWindowRef);
  applyTipWindowQuirks(tipWindowRef);

  tipWindowRef.on('show', () => {
    if (onShowCallback) onShowCallback();
  });

  tipWindowRef.on('hide', () => {
    if (lastExternalOverlay) {
      restoreAfterSelectionOverlay();
      lastExternalOverlay = false;
    }
    if (onHideCallback) onHideCallback();
  });

  tipWindowRef.on('closed', () => {
    restoreAfterSelectionOverlay();
    lastExternalOverlay = false;
    tipWindowRef = null;
    tipContentLoaded = false;
    tipContentReady = null;
  });

  return tipWindowRef;
}

function loadTipContent(win) {
  if (tipContentLoaded) return Promise.resolve();
  if (tipContentReady) return tipContentReady;

  tipContentReady = new Promise((resolve, reject) => {
    const onReady = () => {
      tipContentLoaded = true;
      resolve();
    };
    win.webContents.once('did-fail-load', (_event, _code, description) => {
      tipContentReady = null;
      reject(new Error(description || 'tip window failed to load'));
    });
    win.webContents.once('did-finish-load', () => {
      setTimeout(onReady, 48);
    });
    loadURLFn(win, 'window=tip');
  });

  return tipContentReady;
}

/**
 * cherry-studio SelectionService.showToolbarAtPosition — macOS branch,
 * plus accessory-app overlay elevation so the tip can appear over Chrome.
 */
function reassertExternalTipLayer(win) {
  if (win.isDestroyed() || !win.isVisible()) return;
  win.setAlwaysOnTop(true, TIP_ALWAYS_ON_TOP.level, TIP_ALWAYS_ON_TOP.relativeLevel);
  win.showInactive();
}

function showTipMac(win, programName) {
  const isSelf = isSelfProgram(programName);

  if (!isSelf) {
    elevateForSelectionOverlay();
    lastExternalOverlay = true;
    armBlurHideGrace();
    win.setFocusable(false);
    win.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    });
  }

  win.setAlwaysOnTop(true, TIP_ALWAYS_ON_TOP.level, TIP_ALWAYS_ON_TOP.relativeLevel);
  win.showInactive();
  win.setFocusable(true);

  if (!isSelf) {
    for (const delay of [16, 48, 120, 240]) {
      setTimeout(() => reassertExternalTipLayer(win), delay);
    }
  }
}

function hideTip() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  if (!isAlive() || !isVisible()) {
    restoreAfterSelectionOverlay();
    lastExternalOverlay = false;
    return;
  }
  tipWindowRef.hide();
}

function deliverTipText(win, text) {
  if (!win.webContents.isDestroyed()) {
    win.webContents.send(TIP_IPC_CHANNEL, { text });
  }
}

async function showTip(text, selectionData) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { visible: false, reason: 'empty_text' };

  const { refPoint, refOrientation } = resolveRefPoint(selectionData, SelectionHookRef);
  const { x, y } = calculateToolbarPosition(
    refPoint,
    refOrientation,
    EST_WIDTH,
    EST_HEIGHT
  );

  const win = ensureTipWindow();
  const isExternal = !isSelfProgram(selectionData?.programName || '');

  try {
    await loadTipContent(win);
  } catch (error) {
    lastTipLoadError = error?.message || String(error);
    console.warn('[tip] failed to load tip window:', error);
    throw error;
  }

  // Ghost window: isVisible() true but stuck behind Chrome — reset before re-show.
  if (isExternal && isVisible()) {
    lastExternalOverlay = false;
    win.hide();
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  win.setPosition(x, y, false);
  win.setBounds({ x, y, width: EST_WIDTH, height: EST_HEIGHT });

  deliverTipText(win, trimmed);
  setTimeout(() => deliverTipText(win, trimmed), 80);
  setTimeout(() => deliverTipText(win, trimmed), 200);

  if (process.platform === 'darwin') {
    showTipMac(win, selectionData?.programName || '');
  } else {
    win.show();
  }

  setTimeout(() => deliverTipText(win, trimmed), 320);

  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = setTimeout(() => hideTip(), AUTO_CLOSE_MS);

  return {
    visible: isVisible(),
    bounds: getBounds(),
    refPoint,
    refOrientation,
    externalOverlay: isExternal,
    overlayElevated: lastExternalOverlay,
  };
}

function destroyTipWindow() {
  hideTip();
  if (isAlive()) tipWindowRef.close();
  tipWindowRef = null;
  tipContentLoaded = false;
  tipContentReady = null;
  restoreAfterSelectionOverlay();
  lastExternalOverlay = false;
}

/**
 * Give the tip window focus so that clicking elsewhere triggers blur → hide.
 * Resets blur-grace to allow blur-based dismissal immediately.
 */
function focusTip() {
  if (!isAlive() || !isVisible()) return;
  armBlurHideGrace(0); // cancel any remaining blur suppression
  tipWindowRef.focus();
}

module.exports = {
  init,
  setOnShow,
  setOnHide,
  ensureTipWindow,
  loadTipContent,
  showTip,
  hideTip,
  focusTip,
  isAlive,
  isVisible,
  isContentLoaded,
  getLastTipError,
  getBounds,
  isPointInAppUi,
  destroyTipWindow,
  TIP_IPC_CHANNEL,
};
