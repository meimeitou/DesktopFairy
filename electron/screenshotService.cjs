const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { app, clipboard } = require('electron');
const { isOcrAvailable, recognizeImagePath } = require('./ocrService.cjs');

const execFileAsync = promisify(execFile);

function getScreenshotDir() {
  const dir = path.join(app.getPath('temp'), 'desktopfairy-screenshots');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function toAttachment(filePath) {
  const stats = fs.statSync(filePath);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: path.basename(filePath),
    path: filePath,
    ext: '.png',
    size: stats.size,
    kind: 'image',
  };
}

function hideWindows(windows) {
  const state = [];
  for (const win of windows) {
    if (!win || win.isDestroyed()) continue;
    const wasVisible = win.isVisible();
    state.push({ win, wasVisible });
    if (wasVisible) win.hide();
  }
  return state;
}

function restoreWindows(state) {
  for (const { win, wasVisible } of state) {
    if (!win || win.isDestroyed()) continue;
    if (wasVisible) win.show();
  }
}

async function captureRegion(getWindows) {
  if (process.platform !== 'darwin') {
    throw new Error('区域截图当前仅支持 macOS');
  }

  const dir = getScreenshotDir();
  const filePath = path.join(dir, `screenshot-${Date.now()}.png`);
  const windowState = hideWindows(getWindows());

  try {
    await new Promise((resolve) => setTimeout(resolve, 120));
    await execFileAsync('screencapture', ['-i', '-x', filePath]);
    if (!fs.existsSync(filePath)) return null;
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      fs.unlinkSync(filePath);
      return null;
    }
    return toAttachment(filePath);
  } catch (err) {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        /* ignore */
      }
    }
    const code = err?.code;
    if (code === 1 || err?.killed) return null;
    throw err;
  } finally {
    restoreWindows(windowState);
  }
}

function removeTempFile(filePath) {
  if (!filePath) return;
  try {
    fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }
}

async function screenshotCopyText(getWindows) {
  if (process.platform !== 'darwin') {
    throw new Error('截图复制当前仅支持 macOS');
  }
  if (!isOcrAvailable()) {
    throw new Error('macOS OCR 模块不可用');
  }

  const attachment = await captureRegion(getWindows);
  if (!attachment?.path) return null;

  try {
    const { text } = await recognizeImagePath(attachment.path);
    const trimmed = String(text || '').trim();
    if (!trimmed) return null;
    clipboard.writeText(trimmed);
    return trimmed;
  } finally {
    removeTempFile(attachment.path);
  }
}

function registerScreenshotHandlers(ipcMain, deps) {
  const { getWindows, captureToChat, onScreenshotCopyText } = deps;

  ipcMain.handle('screenshot:capture', async () => {
    return captureRegion(getWindows);
  });

  ipcMain.handle('screenshot:capture_to_chat', async () => {
    const attachment = await captureRegion(getWindows);
    if (!attachment) return null;
    captureToChat({ attachments: [attachment] });
    return attachment;
  });

  ipcMain.handle('screenshot:copy_text', async () => {
    try {
      const text = await screenshotCopyText(getWindows);
      onScreenshotCopyText?.(!!text);
      return text;
    } catch (err) {
      onScreenshotCopyText?.(false);
      throw err;
    }
  });
}

module.exports = {
  registerScreenshotHandlers,
  captureRegion,
  screenshotCopyText,
  getScreenshotDir,
  isOcrAvailable,
};
