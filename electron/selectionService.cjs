const { app, screen, systemPreferences, globalShortcut, clipboard, shell } = require('electron');
const { exec } = require('child_process');
const tipWindow = require('./tipWindow.cjs');
const {
  SELECTION_PREDEFINED_BLACKLIST,
  SELECTION_SELF_APP_MAC,
  SELECTION_FINETUNED_LIST,
} = require('./selectionConfig.cjs');

let SelectionHook = null;
let selectionHookLoadError = null;
let lastTipError = null;
let lastSkipReason = null;
let lastProgramName = null;
let lastSelectionFiredAt = null;
let lastMouseEventAt = null;

const skipReasonForSelection = (selectionData) => {
  if (!selectionEnabled) return 'selection_disabled';
  if (!selectionData?.text?.trim()) return 'empty_text';
  if (isSelfAppProgram(selectionData?.programName)) return 'self_app';
  if (!shouldProcessTextSelection(selectionData)) return 'filtered_app';
  const text = selectionData.text.trim();
  if (text.length > selectionMaxLength) return 'too_long';
  if (tipWindow.isVisible() && isSelfAppProgram(selectionData?.programName)) {
    return 'tip_already_visible';
  }
  return null;
};

const loadSelectionHookModule = () => {
  if (SelectionHook) return SelectionHook;

  try {
    SelectionHook = require('selection-hook');
    selectionHookLoadError = null;
    return SelectionHook;
  } catch (error) {
    selectionHookLoadError = error.message || String(error);
    console.warn('[selection] failed to load selection-hook:', selectionHookLoadError);
  }

  return null;
};

let hook = null;
let hookStarted = false;
let hideListenersActive = false;
let suppressHideUntil = 0;
let selectionEnabled = false;
let selectionMaxLength = 500;
let selectionTriggerMode = 'shortcut';
let currentShortcut = 'Command+Shift+C';

const ACCESSIBILITY_SETTINGS_URL =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility';

const isAccessibilityTrusted = () => {
  if (process.platform !== 'darwin') return true;
  return systemPreferences.isTrustedAccessibilityClient(false);
};

const getAccessibilityDiagnostics = () => {
  loadSelectionHookModule();
  const trusted = isAccessibilityTrusted();
  return {
    supported: process.platform === 'darwin',
    trusted,
    hookAvailable: !!SelectionHook,
    hookLoadError: selectionHookLoadError,
    hookStarted,
    selectionEnabled,
    selectionTriggerMode,
    tipVisible: tipWindow.isVisible(),
    tipLoaded: tipWindow.isContentLoaded?.() ?? false,
    lastSkipReason,
    lastProgramName,
    lastSelectionFiredAt,
    lastMouseEventAt,
    lastTipError,
    nativeMacTrusted: (() => {
      try {
        return hook?.macIsProcessTrusted?.() ?? null;
      } catch {
        return null;
      }
    })(),
    execPath: process.execPath,
    packaged: app.isPackaged,
    grantTargetHint: app.isPackaged
      ? '/Applications/DesktopFairy.app'
      : process.execPath,
  };
};

const isSelfAppProgram = (programName) => {
  const name = String(programName || '');
  if (!name) return false;
  return SELECTION_SELF_APP_MAC.some((token) =>
    token.endsWith('.') ? name.startsWith(token) : name === token || name.includes(token)
  );
};

const applyTriggerMode = () => {
  if (!hook || !SelectionHook) return;
  // cherry SelectionTriggerMode.Selected: passive false — rely on text-selection events only.
  hook.setSelectionPassiveMode(selectionTriggerMode === 'shortcut');
};

const setHookGlobalFilterMode = () => {
  if (!hook || !SelectionHook) return;

  if (selectionTriggerMode === 'auto') {
    // Only exclude at the native level what can't be caught by JS-level isSelfAppProgram.
    // Do NOT include SELECTION_SELF_APP_MAC here: in packaged builds the app's own
    // bundle ID (com.desktop.fairy) is in that list, and some native module versions
    // may mis-apply the exclude filter and suppress ALL events when the observer
    // process's bundle ID appears in the list. JS-level filtering handles self-app.
    hook.setGlobalFilterMode(SelectionHook.FilterMode.EXCLUDE_LIST, [
      ...SELECTION_PREDEFINED_BLACKLIST.MAC,
    ]);
  } else {
    hook.setGlobalFilterMode(SelectionHook.FilterMode.DEFAULT, []);
  }
};

const initHookConfig = () => {
  if (!hook || !SelectionHook) return;

  hook.enableClipboard();
  hook.setFineTunedList(
    SelectionHook.FineTunedListType.EXCLUDE_CLIPBOARD_CURSOR_DETECT,
    SELECTION_FINETUNED_LIST.EXCLUDE_CLIPBOARD_CURSOR_DETECT.MAC
  );
  hook.setFineTunedList(
    SelectionHook.FineTunedListType.INCLUDE_CLIPBOARD_DELAY_READ,
    SELECTION_FINETUNED_LIST.INCLUDE_CLIPBOARD_DELAY_READ.MAC
  );
  setHookGlobalFilterMode();
  applyTriggerMode();
};

const shouldProcessTextSelection = (selectionData) => {
  if (isSelfAppProgram(selectionData?.programName)) return false;

  if (selectionTriggerMode !== 'auto') return true;
  const programName = String(selectionData?.programName || '').toLowerCase();
  if (!programName) return true;
  return !SELECTION_PREDEFINED_BLACKLIST.MAC.some((item) =>
    programName.includes(item)
  );
};

const startHideListeners = () => {
  if (!hook || hideListenersActive) return;
  suppressHideUntil = Date.now() + 450;
  hook.on('mouse-down', onMouseDownHide);
  hook.on('mouse-wheel', onHideInteraction);
  hook.on('key-down', onKeyDownHide);
  hideListenersActive = true;
};

const stopHideListeners = () => {
  if (!hook || !hideListenersActive) return;
  hook.off('mouse-down', onMouseDownHide);
  hook.off('mouse-wheel', onHideInteraction);
  hook.off('key-down', onKeyDownHide);
  hideListenersActive = false;
};

const hideTip = () => {
  tipWindow.hideTip();
};

const processTextSelection = (selectionData) => {
  try {
    const cursor = screen.getCursorScreenPoint();
    if (tipWindow.isPointInAppUi(cursor)) {
      if (tipWindow.isVisible()) hideTip();
      return;
    }

    const skipReason = skipReasonForSelection(selectionData);
    if (skipReason) return;

    const text = selectionData.text.trim();
    suppressHideUntil = Date.now() + 450;

    void tipWindow.showTip(text, selectionData).catch((error) => {
      lastTipError = error?.message || String(error);
      console.warn('[selection] show tip failed:', error);
    });
  } catch (error) {
    lastTipError = error?.message || String(error);
    console.warn('[selection] processTextSelection failed:', error);
  }
};

const onTextSelection = (selectionData) => {
  lastSelectionFiredAt = Date.now();
  lastProgramName = selectionData?.programName || null;
  const skipReason = skipReasonForSelection(selectionData);
  if (skipReason) {
    lastSkipReason = `${skipReason} (program=${lastProgramName})`;
  } else {
    lastSkipReason = null;
  }
  processTextSelection(selectionData);
};

const onMouseDownHide = (data) => {
  if (Date.now() < suppressHideUntil) return;

  const mousePoint = { x: Math.round(Number(data?.x)), y: Math.round(Number(data?.y)) };
  if (!Number.isFinite(mousePoint.x) || !Number.isFinite(mousePoint.y)) return;

  if (tipWindow.isPointInAppUi(mousePoint)) {
    if (tipWindow.isVisible()) hideTip();
    return;
  }

  if (!tipWindow.isVisible()) return;
  const bounds = tipWindow.getBounds();
  if (!bounds) return;

  const inside =
    mousePoint.x >= bounds.x &&
    mousePoint.x <= bounds.x + bounds.width &&
    mousePoint.y >= bounds.y &&
    mousePoint.y <= bounds.y + bounds.height;

  if (!inside) hideTip();
};

const onHideInteraction = () => {
  if (tipWindow.isVisible()) hideTip();
};

const isShiftKey = (vkCode) => vkCode === 56 || vkCode === 60;
const isAltKey = (vkCode) => vkCode === 58 || vkCode === 61;

const onKeyDownHide = (data) => {
  if (!tipWindow.isVisible()) return;
  if (isShiftKey(data?.vkCode) || isAltKey(data?.vkCode)) return;
  hideTip();
};

const ensureHookInstance = () => {
  if (!SelectionHook) {
    loadSelectionHookModule();
  }
  if (!SelectionHook) return false;

  if (!hook) {
    hook = new SelectionHook();
    hook.on('error', (error) => {
      console.warn('[selection] hook error:', error?.message || error);
    });
  }
  return true;
};

const stopHook = ({ cleanup = false } = {}) => {
  stopHideListeners();
  if (!hook || !hookStarted) return;
  try {
    hook.stop();
    hook.removeAllListeners('text-selection');
    if (cleanup) {
      hook.cleanup();
      hook = null;
    } else {
      hook.removeAllListeners('error');
      hook.on('error', (error) => {
        console.warn('[selection] hook error:', error?.message || error);
      });
    }
  } catch (error) {
    console.warn('[selection] stop hook failed:', error);
  }
  hookStarted = false;
};

const startHook = (isDev) => {
  if (process.platform !== 'darwin') return false;

  if (!isAccessibilityTrusted()) {
    console.warn('[selection] Accessibility not granted — hook not started');
    return false;
  }

  if (!ensureHookInstance()) return false;

  const win = tipWindow.ensureTipWindow();
  void tipWindow.loadTipContent(win).catch((error) => {
    console.warn('[selection] tip window preload failed:', error);
  });

  hook.removeAllListeners('text-selection');
  hook.removeAllListeners('mouse-down');
  hook.on('text-selection', onTextSelection);
  hook.on('mouse-down', () => { lastMouseEventAt = Date.now(); });

  if (!hook.start({ debug: !!isDev })) {
    console.warn('[selection] failed to start selection-hook');
    return false;
  }

  hookStarted = true;
  initHookConfig();
  return true;
};

const restartSelectionHook = (isDev) => {
  stopHook();
  return startHook(isDev);
};

let lastAppliedSelectionKey = '';

const selectionSettingsKey = (settings) =>
  JSON.stringify({
    enabled: settings?.selectionEnabled !== false,
    mode: settings?.selectionTriggerMode === 'auto' ? 'auto' : 'shortcut',
    shortcut: settings?.selectionShortcut || currentShortcut,
    maxLen: Number(settings?.selectionMaxLength) || 500,
  });

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
    if (data?.text?.trim() && !isSelfAppProgram(data.programName)) {
      processTextSelection(data);
      setTimeout(() => tipWindow.focusTip(), 200);
      return;
    }
  }

  copySelectionViaAppleScript((text) => {
    if (text?.trim()) {
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
      setTimeout(() => tipWindow.focusTip(), 200);
    }
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
  tipWindow.setOnShow(() => {
    suppressHideUntil = Date.now() + 500;
    setTimeout(startHideListeners, 480);
  });
  tipWindow.setOnHide(stopHideListeners);

  selectionEnabled = settings?.selectionEnabled !== false;
  selectionMaxLength = Number(settings?.selectionMaxLength) || 500;
  const prevMode = selectionTriggerMode;
  selectionTriggerMode =
    settings?.selectionTriggerMode === 'auto' ? 'auto' : 'shortcut';

  const nextShortcut = settings?.selectionShortcut || currentShortcut;

  if (!selectionEnabled || process.platform !== 'darwin') {
    stopHook({ cleanup: true });
    tipWindow.destroyTipWindow();
    globalShortcut.unregister(currentShortcut);
    lastAppliedSelectionKey = '';
    return {
      hookReady: false,
      shortcutRegistered: false,
      hookAvailable: !!SelectionHook,
      ...getAccessibilityDiagnostics(),
    };
  }

  const key = selectionSettingsKey(settings);
  const configChanged = key !== lastAppliedSelectionKey;
  lastAppliedSelectionKey = key;

  let hookReady = false;

  if (configChanged || !hookStarted) {
    hookReady = restartSelectionHook(deps.isDev);
  } else if (prevMode !== selectionTriggerMode) {
    initHookConfig();
    hookReady = hookStarted;
  } else {
    hookReady = hookStarted;
  }

  const shortcutRegistered = registerShortcut(nextShortcut);
  if (!shortcutRegistered && selectionTriggerMode === 'shortcut') {
    setTimeout(() => registerShortcut(nextShortcut), 1500);
  }

  const diagnostics = getAccessibilityDiagnostics();
  if (!diagnostics.trusted) {
    console.warn('[selection] accessibility not trusted for', process.execPath);
  } else if (!hookReady) {
    console.warn('[selection] accessibility trusted but hook failed to start');
  }

  return {
    hookReady,
    shortcutRegistered,
    accessibilityTrusted: diagnostics.trusted,
    hookAvailable: !!SelectionHook,
    ...diagnostics,
  };
};

const reinitAfterAccessibilityGrant = (settings, deps) => {
  if (!isAccessibilityTrusted()) return applySelectionSettings(settings, deps);
  // Clean up the existing hook instance so startHook() creates a fresh one.
  // This is equivalent to toggle OFF→ON and reliably clears any native state.
  stopHook({ cleanup: true });
  lastAppliedSelectionKey = '';
  return applySelectionSettings(settings, deps);
};

const stopAll = () => {
  stopHook({ cleanup: true });
  tipWindow.destroyTipWindow();
  if (currentShortcut) {
    globalShortcut.unregister(currentShortcut);
  }
};

const getAccessibilityStatus = () => getAccessibilityDiagnostics();

const openAccessibilitySettings = () => {
  if (process.platform !== 'darwin') return false;
  shell.openExternal(ACCESSIBILITY_SETTINGS_URL).catch((error) => {
    console.warn('[selection] failed to open Accessibility settings:', error);
  });
  return true;
};

const promptAccessibility = () => {
  if (process.platform !== 'darwin') return false;

  if (!isAccessibilityTrusted()) {
    systemPreferences.isTrustedAccessibilityClient(true);
  }

  openAccessibilitySettings();
  return isAccessibilityTrusted();
};

module.exports = {
  applySelectionSettings,
  reinitAfterAccessibilityGrant,
  stopAll,
  getAccessibilityStatus,
  openAccessibilitySettings,
  promptAccessibility,
  hideTip,
};
