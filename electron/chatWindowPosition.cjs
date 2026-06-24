const CHAT_GAP = 12;

function clampToWorkArea(x, y, width, height, workArea) {
  return {
    x: Math.round(Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - width))),
    y: Math.round(Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - height))),
  };
}

function getChatWindowSize(chatWindow, fallback = { width: 853, height: 520 }) {
  if (chatWindow && !chatWindow.isDestroyed()) {
    const [width, height] = chatWindow.getSize();
    return { width, height };
  }
  return fallback;
}

function resolveRefPoint(screen, mainWindow, refPoint) {
  if (refPoint && Number.isFinite(refPoint.x) && Number.isFinite(refPoint.y)) {
    return refPoint;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    const [x, y] = mainWindow.getPosition();
    const [w, h] = mainWindow.getSize();
    return { x: x + w / 2, y: y + h / 2 };
  }
  return screen.getCursorScreenPoint();
}

/** Place chat window to the left or right of a screen point (e.g. selection toolbar / cursor). */
function resolveChatWindowPositionNearPoint(screen, chatWindow, refPoint) {
  const { width: chatW, height: chatH } = getChatWindowSize(chatWindow);
  const ref = resolveRefPoint(screen, null, refPoint);
  const display = screen.getDisplayNearestPoint(ref);
  const { workArea } = display;

  let x = ref.x + CHAT_GAP;
  let y = ref.y - Math.round(chatH / 2);

  if (x + chatW > workArea.x + workArea.width) {
    x = ref.x - chatW - CHAT_GAP;
  }
  if (x < workArea.x) {
    x = ref.x - Math.round(chatW / 2);
  }

  return clampToWorkArea(x, y, chatW, chatH, workArea);
}

/** Place chat window beside the Live2D main window on the display the user is on. */
function resolveChatWindowPosition(screen, mainWindow, chatWindow, refPoint, options = {}) {
  const { anchor = 'main' } = options;

  if (anchor === 'cursor') {
    return resolveChatWindowPositionNearPoint(screen, chatWindow, refPoint);
  }

  const { width: chatW, height: chatH } = getChatWindowSize(chatWindow);
  const ref = resolveRefPoint(screen, mainWindow, refPoint);
  const display = screen.getDisplayNearestPoint(ref);
  const { workArea } = display;

  if (!mainWindow || mainWindow.isDestroyed()) {
    return clampToWorkArea(
      workArea.x + Math.round((workArea.width - chatW) / 2),
      workArea.y + Math.round((workArea.height - chatH) / 2),
      chatW,
      chatH,
      workArea
    );
  }

  const [mainX, mainY] = mainWindow.getPosition();
  const [mainW, mainH] = mainWindow.getSize();

  let x = mainX + mainW + CHAT_GAP;
  let y = mainY;

  if (x + chatW > workArea.x + workArea.width) {
    x = mainX - chatW - CHAT_GAP;
  }
  if (x < workArea.x) {
    x = mainX + Math.round((mainW - chatW) / 2);
  }

  if (chatH > mainH) {
    y = mainY + Math.round((mainH - chatH) / 2);
  }

  return clampToWorkArea(x, y, chatW, chatH, workArea);
}

function positionChatWindowNearMain(screen, mainWindow, chatWindow, refPoint, options = {}) {
  if (!chatWindow || chatWindow.isDestroyed()) return;
  const pos = resolveChatWindowPosition(screen, mainWindow, chatWindow, refPoint, options);
  chatWindow.setPosition(pos.x, pos.y);
}

/** Match main window: visible on every Space while chat is open. */
function attachChatToAllSpaces(chatWindow) {
  if (process.platform !== 'darwin') return;
  if (!chatWindow || chatWindow.isDestroyed()) return;
  chatWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}

function detachChatFromAllSpaces(chatWindow) {
  if (process.platform !== 'darwin') return;
  if (!chatWindow || chatWindow.isDestroyed()) return;
  chatWindow.setVisibleOnAllWorkspaces(false);
}

function presentChatWindow(screen, mainWindow, chatWindow, refPoint, options = {}) {
  if (!chatWindow || chatWindow.isDestroyed()) return;

  const { anchor = 'main' } = options;

  if (anchor === 'main' && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }

  attachChatToAllSpaces(chatWindow);
  positionChatWindowNearMain(screen, mainWindow, chatWindow, refPoint, options);
  chatWindow.show();
  chatWindow.focus();
  positionChatWindowNearMain(screen, mainWindow, chatWindow, refPoint, options);
}

function hideChatWindow(chatWindow) {
  if (!chatWindow || chatWindow.isDestroyed()) return;
  chatWindow.hide();
  detachChatFromAllSpaces(chatWindow);
}

module.exports = {
  resolveChatWindowPosition,
  resolveChatWindowPositionNearPoint,
  positionChatWindowNearMain,
  attachChatToAllSpaces,
  detachChatFromAllSpaces,
  presentChatWindow,
  hideChatWindow,
};
