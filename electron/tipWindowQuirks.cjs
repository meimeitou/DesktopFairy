/**
 * macOS window quirks for the selection tip toolbar.
 * Ported from cherry-studio/src/main/core/window/quirks.ts + behavior.ts (SelectionToolbar).
 */
const { BrowserWindow } = require('electron');

const TIP_ALWAYS_ON_TOP = { level: 'screen-saver', relativeLevel: 1 };

let suppressBlurHideUntil = 0;

function shouldSuppressBlurHide() {
  return Date.now() < suppressBlurHideUntil;
}

function armBlurHideGrace(ms = 700) {
  suppressBlurHideUntil = Date.now() + ms;
}

function beginMacFocusGuard() {
  const focusableWindows = [];
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && win.isVisible() && win.isFocusable()) {
      focusableWindows.push(win);
      win.setFocusable(false);
    }
  }
  return focusableWindows;
}

function endMacFocusGuard(focusableWindows) {
  setTimeout(() => {
    for (const win of focusableWindows) {
      if (!win.isDestroyed()) {
        win.setFocusable(true);
      }
    }
  }, 50);
}

/** Initial setters — cherry applyWindowBehavior for SelectionToolbar */
function applyTipWindowBehavior(win) {
  if (process.platform !== 'darwin') return;

  win.setAlwaysOnTop(true, TIP_ALWAYS_ON_TOP.level, TIP_ALWAYS_ON_TOP.relativeLevel);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.on('blur', () => {
    if (shouldSuppressBlurHide()) return;
    if (win.isDestroyed() || !win.isVisible()) return;
    win.hide();
  });
}

/** Monkey-patch show/hide — cherry applyWindowQuirks (SelectionToolbar) */
function applyTipWindowQuirks(win) {
  if (process.platform !== 'darwin') return;

  const originalHide = win.hide.bind(win);
  const originalClose = win.close.bind(win);
  const originalShow = win.show.bind(win);
  const originalShowInactive = win.showInactive.bind(win);

  const reapplyAlwaysOnTop = () => {
    if (win.isDestroyed()) return;
    win.setAlwaysOnTop(true, TIP_ALWAYS_ON_TOP.level, TIP_ALWAYS_ON_TOP.relativeLevel);
  };

  win.hide = () => {
    const guard = beginMacFocusGuard();
    originalHide();
    if (!win.isDestroyed()) {
      win.webContents.sendInputEvent({ type: 'mouseMove', x: -1, y: -1 });
    }
    endMacFocusGuard(guard);
  };

  win.close = () => {
    const guard = beginMacFocusGuard();
    originalClose();
    endMacFocusGuard(guard);
  };

  win.show = () => {
    originalShow();
    reapplyAlwaysOnTop();
  };

  win.showInactive = () => {
    originalShowInactive();
    reapplyAlwaysOnTop();
  };
}

module.exports = {
  applyTipWindowBehavior,
  applyTipWindowQuirks,
  armBlurHideGrace,
  TIP_ALWAYS_ON_TOP,
};
