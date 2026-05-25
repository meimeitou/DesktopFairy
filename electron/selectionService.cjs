const { screen, systemPreferences, globalShortcut, clipboard } = require('electron');
const { exec } = require('child_process');
const tipWindow = require('./tipWindow.cjs');
const {
  SELECTION_PREDEFINED_BLACKLIST,
  SELECTION_FINETUNED_LIST,
} = require('./selectionConfig.cjs');

let SelectionHook = null;
try {
  SelectionHook = require('selection-hook');
} catch (error) {
  console.warn('[selection] selection-hook not available:', error.message);
}

let hook = null;
let hookStarted = false;
let hideListenersActive = false;
let selectionEnabled = false;
let selectionMaxLength = 500;
let selectionTriggerMode = 'shortcut';
let currentShortcut = 'Command+Shift+C';

const stopHook = () => {
  stopHideListeners();
  if (!hook || !hookStarted) return;
  try {
    hook.stop();
    hook.removeAllListeners('text-selection');
    hook.removeAllListeners('error');
  } catch (error) {
    console.warn('[selection] stop hook failed:', error);
  }
  hookStarted = false;
};

const initHookConfig = () => {
  if (!hook || !SelectionHook) return;

  if (selectionTriggerMode === 'auto') {
    hook.setGlobalFilterMode(
      SelectionHook.FilterMode.EXCLUDE_LIST,
      [...SELECTION_PREDEFINED_BLACKLIST.MAC]
    );
  } else {
    hook.setGlobalFilterMode(SelectionHook.FilterMode.DEFAULT, []);
  }

  hook.setFineTunedList(
    SelectionHook.FineTunedListType.EXCLUDE_CLIPBOARD_CURSOR_DETECT,
    SELECTION_FINETUNED_LIST.EXCLUDE_CLIPBOARD_CURSOR_DETECT.MAC
  );
  hook.setFineTunedList(
    SelectionHook.FineTunedListType.INCLUDE_CLIPBOARD_DELAY_READ,
    SELECTION_FINETUNED_LIST.INCLUDE_CLIPBOARD_DELAY_READ.MAC
  );
};

const shouldProcessTextSelection = (selectionData) => {
  if (selectionTriggerMode !== 'auto') return true;
  const programName = String(selectionData?.programName || '').toLowerCase();
  if (!programName) return true;
  return !SELECTION_PREDEFINED_BLACKLIST.MAC.some((item) =>
    programName.includes(item)
  );
};

const processTextSelection = (selectionData) => {
  try {
    if (!selectionEnabled || !selectionData?.text?.trim()) return;
    if (!shouldProcessTextSelection(selectionData)) return;

    const text = selectionData.text.trim();
    if (text.length > selectionMaxLength) return;

    if (tipWindow.isVisible()) {
      tipWindow.hideTip();
    }

    tipWindow.showTip(text, selectionData);
    startHideListeners();
  } catch (error) {
    console.warn('[selection] processTextSelection failed:', error);
  }
};

const onTextSelection = (selectionData) => {
  if (!selectionEnabled || selectionTriggerMode !== 'auto') return;
  setImmediate(() => {
    try {
      processTextSelection(selectionData);
    } catch (error) {
      console.warn('[selection] text-selection handler failed:', error);
    }
  });
};

const onMouseDownHide = (data) => {
  if (!tipWindow.isVisible()) return;
  const bounds = tipWindow.getBounds();
  if (!bounds) return;
  const x = Math.round(Number(data?.x));
  const y = Math.round(Number(data?.y));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const inside =
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height;
  if (!inside) tipWindow.hideTip();
};

const onHideInteraction = () => {
  tipWindow.hideTip();
};

const startHideListeners = () => {
  if (!hook || hideListenersActive) return;
  hook.on('mouse-down', onMouseDownHide);
  hook.on('mouse-wheel', onHideInteraction);
  hook.on('key-down', onHideInteraction);
  hideListenersActive = true;
};

const stopHideListeners = () => {
  if (!hook || !hideListenersActive) return;
  hook.off('mouse-down', onMouseDownHide);
  hook.off('mouse-wheel', onHideInteraction);
  hook.off('key-down', onHideInteraction);
  hideListenersActive = false;
};

const ensureHook = (isDev) => {
  if (process.platform !== 'darwin' || !SelectionHook) return false;

  if (!systemPreferences.isTrustedAccessibilityClient(false)) {
    console.warn('[selection] Accessibility permission required');
    return false;
  }

  if (!hook) {
    hook = new SelectionHook();
    hook.on('error', (error) => {
      console.warn('[selection] hook error:', error?.message || error);
    });
  }

  if (!hookStarted) {
    if (!hook.start({ debug: !!isDev })) {
      console.warn('[selection] failed to start selection-hook');
      return false;
    }
    hookStarted = true;
    initHookConfig();
  }

  hook.removeAllListeners('text-selection');
  hook.on('text-selection', onTextSelection);
  hook.setSelectionPassiveMode(selectionTriggerMode === 'shortcut');
  initHookConfig();
  return true;
};

const copySelectionViaAppleScript = (callback) => {
  exec(
    `osascript -e 'tell application "System Events" to keystroke "c" using command down'`,
    (error) => {
      if (error) {
        console.error('[selection] AppleScript copy failed:', error);
        callback(null);
        return;
      }
      setTimeout(() => callback(clipboard.readText()), 100);
    }
  );
};

const triggerByShortcut = () => {
  if (!selectionEnabled || selectionTriggerMode !== 'shortcut') return;

  if (hook && hookStarted) {
    const data = hook.getCurrentSelection();
    if (data?.text?.trim()) {
      setImmediate(() => processTextSelection(data));
      return;
    }
  }

  copySelectionViaAppleScript((text) => {
    if (!text?.trim()) return;
    const cursor = screen.getCursorScreenPoint();
    processTextSelection({
      text,
      programName: '',
      posLevel: SelectionHook?.PositionLevel?.NONE,
      mousePosStart: cursor,
      mousePosEnd: cursor,
      startTop: cursor,
      startBottom: cursor,
      endTop: cursor,
      endBottom: cursor,
    });
  });
};

const registerShortcut = (shortcut) => {
  if (process.platform !== 'darwin') return false;

  if (currentShortcut && currentShortcut !== shortcut) {
    globalShortcut.unregister(currentShortcut);
  }
  currentShortcut = shortcut;

  if (!selectionEnabled || selectionTriggerMode !== 'shortcut') {
    globalShortcut.unregister(currentShortcut);
    return true;
  }

  const ok = globalShortcut.register(currentShortcut, triggerByShortcut);
  if (!ok) {
    console.warn(`[selection] failed to register shortcut: ${currentShortcut}`);
  }
  return ok;
};

const applySelectionSettings = (settings, deps) => {
  tipWindow.init({
    loadURL: deps.loadURL,
    SelectionHook,
  });

  selectionEnabled = settings?.selectionEnabled !== false;
  selectionMaxLength = Number(settings?.selectionMaxLength) || 500;
  selectionTriggerMode =
    settings?.selectionTriggerMode === 'auto' ? 'auto' : 'shortcut';

  const nextShortcut = settings?.selectionShortcut || currentShortcut;

  if (!selectionEnabled || process.platform !== 'darwin') {
    stopHook();
    tipWindow.destroyTipWindow();
    globalShortcut.unregister(currentShortcut);
    return { hookReady: false, shortcutRegistered: false };
  }

  const hookReady = ensureHook(deps.isDev);

  if (selectionTriggerMode === 'shortcut' && !hookReady) {
    stopHook();
  }

  const shortcutRegistered = registerShortcut(nextShortcut);

  return { hookReady, shortcutRegistered };
};

const stopAll = () => {
  stopHook();
  tipWindow.destroyTipWindow();
  if (currentShortcut) {
    globalShortcut.unregister(currentShortcut);
  }
};

const getAccessibilityStatus = () => {
  if (process.platform !== 'darwin') {
    return { supported: false, trusted: false, hookAvailable: !!SelectionHook };
  }
  return {
    supported: true,
    hookAvailable: !!SelectionHook,
    trusted: systemPreferences.isTrustedAccessibilityClient(false),
  };
};

const promptAccessibility = () => {
  if (process.platform !== 'darwin') return false;
  return systemPreferences.isTrustedAccessibilityClient(true);
};

module.exports = {
  applySelectionSettings,
  stopAll,
  getAccessibilityStatus,
  promptAccessibility,
};
