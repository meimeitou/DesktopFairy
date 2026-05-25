const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { app } = require('electron');

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

function registerScreenshotHandlers(ipcMain, deps) {
  const { getWindows, captureToChat } = deps;

  ipcMain.handle('screenshot:capture', async () => {
    return captureRegion(getWindows);
  });

  ipcMain.handle('screenshot:capture_to_chat', async () => {
    const attachment = await captureRegion(getWindows);
    if (!attachment) return null;
    captureToChat({ attachments: [attachment] });
    return attachment;
  });
}

module.exports = { registerScreenshotHandlers, captureRegion, getScreenshotDir };
