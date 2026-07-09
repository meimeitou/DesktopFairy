const fs = require('fs');
const path = require('path');
const { protocol, dialog, BrowserWindow } = require('electron');

const BUNDLED_PREFIX = '/models/';

function isBundledModelPath(modelPath) {
  return String(modelPath || '').startsWith(BUNDLED_PREFIX);
}

function resolveModelFsPath(modelPath, publicRoot) {
  const p = String(modelPath || '').trim();
  if (!p) return null;
  if (isBundledModelPath(p)) {
    return path.join(publicRoot, p.replace(/^\//, ''));
  }
  if (path.isAbsolute(p)) {
    return p;
  }
  return path.join(publicRoot, p.replace(/^\//, ''));
}

function findModel3Json(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return { error: '无法读取所选目录' };
  }

  const matches = entries.filter((f) => f.endsWith('.model3.json'));
  if (matches.length === 0) {
    return { error: '目录中未找到 .model3.json 文件' };
  }

  const dirName = path.basename(dir);
  // Prefer "<dirName>.model3.json" (the common Live2D naming convention);
  // otherwise fall back to the first match alphabetically. Always return a
  // concrete path so the caller can load immediately — surfacing a chooser
  // for multiple matches caused the model to flicker/jump during loading.
  const preferred = `${dirName}.model3.json`;
  let chosen;
  let warning = null;
  if (matches.includes(preferred)) {
    chosen = preferred;
  } else if (matches.length === 1) {
    chosen = matches[0];
  } else {
    chosen = [...matches].sort()[0];
    warning = `目录含多个 model3.json，已选用 ${chosen}`;
  }

  const fullPath = path.join(dir, chosen);
  if (!fs.existsSync(fullPath)) {
    return { error: '模型配置文件不存在' };
  }

  return {
    name: dirName,
    path: fullPath,
    source: 'local',
    warning,
  };
}

function scanBundledModels(modelsDir) {
  try {
    return fs
      .readdirSync(modelsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => ({
        name: e.name,
        path: `/models/${e.name}/${e.name}.model3.json`,
        source: 'bundled',
      }));
  } catch {
    return [];
  }
}

function loadCustomModelsFromDisk(settingsPath) {
  try {
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const custom = Array.isArray(data.customModels) ? data.customModels : [];
    return custom
      .filter((m) => m && typeof m.path === 'string' && m.path.trim())
      .map((m) => ({
        name: String(m.name || path.basename(path.dirname(m.path))),
        path: m.path.trim(),
        source: 'local',
        missing: !fs.existsSync(m.path.trim()),
      }));
  } catch {
    return [];
  }
}

function inspectModelFile(fullPath) {
  try {
    const json = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const refs = json?.FileReferences ?? {};
    const expressions = Array.isArray(refs.Expressions)
      ? refs.Expressions.map((e) => e?.Name).filter(Boolean)
      : [];
    const motionGroups =
      refs.Motions && typeof refs.Motions === 'object'
        ? Object.keys(refs.Motions)
        : [];
    return { expressions, motionGroups };
  } catch {
    return { expressions: [], motionGroups: [] };
  }
}

function dfmodelPathFromUrl(url) {
  try {
    const parsed = new URL(String(url || ''));
    if (parsed.protocol !== 'dfmodel:') return '';

    let filePath = decodeURIComponent(parsed.pathname);
    const host = parsed.hostname;

    if (host === 'local' || host === 'localhost') {
      if (process.platform === 'win32' && /^\/[A-Za-z]:\//.test(filePath)) {
        return filePath.slice(1);
      }
      return filePath;
    }

    // Chromium may mis-parse dfmodel:///Users/... as host "users", path "/yin/...".
    if (host) {
      filePath = `/${host}${parsed.pathname}`;
    }

    if (process.platform === 'win32' && /^\/[A-Za-z]:\//.test(filePath)) {
      return filePath.slice(1);
    }
    return filePath;
  } catch {
    let raw = String(url || '').replace(/^dfmodel:\/\//i, '');
    if (raw.startsWith('local/')) raw = raw.slice('local/'.length);
    else if (raw.startsWith('local')) raw = raw.slice('local'.length);
    else if (raw.startsWith('localhost/')) raw = raw.slice('localhost/'.length);
    else if (raw.startsWith('localhost')) raw = raw.slice('localhost'.length);

    let filePath = decodeURIComponent(raw);
    if (!filePath.startsWith('/') && !/^[A-Za-z]:/.test(filePath)) {
      filePath = `/${filePath}`;
    }
    if (process.platform === 'win32' && filePath.startsWith('/')) {
      const driveMatch = filePath.match(/^\/([A-Za-z]):\//);
      if (driveMatch) {
        filePath = `${driveMatch[1]}:${filePath.slice(driveMatch[0].length - 1)}`;
      }
    }
    return filePath;
  }
}

function registerLive2DSchemes() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'dfmodel',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true,
      },
    },
  ]);
}

function registerLive2DProtocol() {
  protocol.registerFileProtocol('dfmodel', (request, callback) => {
    try {
      const filePath = dfmodelPathFromUrl(request.url);
      if (!filePath) {
        callback({ error: -6 });
        return;
      }
      // Resolve and verify it's a real file. existsSync is true for
      // directories, so a user-pasted directory path would otherwise be
      // served as a "file" and fail later with a confusing parse error.
      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch {
        callback({ error: -6 });
        return;
      }
      if (!stat.isFile()) {
        callback({ error: -6 });
        return;
      }
      callback({ path: filePath });
    } catch {
      callback({ error: -2 });
    }
  });
}

function registerLive2DHandlers({
  ipcMain,
  getMainWindow,
  modelsDir,
  publicRoot,
  settingsPath,
}) {
  const listModels = () => {
    const bundled = scanBundledModels(modelsDir);
    const custom = loadCustomModelsFromDisk(settingsPath());
    const seen = new Set();
    const merged = [];
    for (const item of [...bundled, ...custom]) {
      if (seen.has(item.path)) continue;
      seen.add(item.path);
      merged.push(item);
    }
    return merged;
  };

  ipcMain.handle('live2d:list_models', async () => listModels());

  ipcMain.handle('live2d:switch_model', async (_event, modelPath) => {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('live2d:switch_model', modelPath);
    }
  });

  ipcMain.handle('live2d:command', async (_event, cmd) => {
    pushLive2DCommand(getMainWindow, cmd);
  });

  ipcMain.handle('live2d:bubble', async (_event, payload) => {
    pushLive2DBubble(getMainWindow, payload);
  });

  ipcMain.handle('live2d:inspect_model', async (_event, modelPath) => {
    const fullPath = resolveModelFsPath(modelPath, publicRoot);
    if (!fullPath || !fs.existsSync(fullPath)) {
      return { expressions: [], motionGroups: [] };
    }
    return inspectModelFile(fullPath);
  });

  // Validate a model path typed by the user (or pasted). Accepts:
  //  - a bundled "/models/..." path
  //  - an absolute path to a .model3.json file
  //  - a directory containing one (or more) .model3.json files
  // Returns { path } on success, { error } / { warning, matches } otherwise.
  ipcMain.handle('live2d:validate_model_path', async (_event, rawPath) => {
    const p = String(rawPath || '').trim();
    if (!p) return { error: '路径为空' };

    if (isBundledModelPath(p)) {
      const full = resolveModelFsPath(p, publicRoot);
      if (!full || !fs.existsSync(full)) return { error: '内置模型不存在' };
      return { path: p };
    }

    let stat;
    try {
      stat = fs.statSync(p);
    } catch {
      return { error: '路径不存在，请检查后重试' };
    }

    if (stat.isDirectory()) {
      return findModel3Json(p);
    }

    if (stat.isFile() && p.toLowerCase().endsWith('.model3.json')) {
      return { path: p };
    }

    return { error: '请选择 .model3.json 文件或包含它的目录' };
  });

  ipcMain.handle('live2d:select_model_dir', async (event) => {
    const win = event.sender
      ? BrowserWindow.fromWebContents(event.sender)
      : null;
    const result = await dialog.showOpenDialog(win || undefined, {
      // Allow picking either a directory (resolved via findModel3Json) or a
      // single .model3.json file directly. Both openFile and openDirectory
      // are supported together on macOS.
      properties: ['openFile', 'openDirectory'],
      title: '选择 Live2D 模型（目录或 .model3.json 文件）',
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }
    const picked = result.filePaths[0];

    let stat;
    try {
      stat = fs.statSync(picked);
    } catch {
      return { error: '无法读取所选路径' };
    }

    if (stat.isDirectory()) {
      const found = findModel3Json(picked);
      if (found.error) return { error: found.error };
      return found;
    }

    if (stat.isFile() && picked.toLowerCase().endsWith('.model3.json')) {
      return {
        name: path.basename(picked).slice(0, -'.model3.json'.length),
        path: picked,
        source: 'local',
        warning: null,
      };
    }

    return { error: '请选择 .model3.json 文件或包含它的目录' };
  });
}

function pushLive2DCommand(getMainWindow, cmd, options = {}) {
  const { showWindow = false, delayMs = 0 } = options;
  const win = getMainWindow();
  if (!win || win.isDestroyed()) return;

  const deliver = () => {
    if (win.isDestroyed()) return;
    win.webContents.send('live2d:command', cmd);
  };

  const schedule = () => {
    if (delayMs > 0) setTimeout(deliver, delayMs);
    else deliver();
  };

  if (showWindow) {
    if (!win.isVisible()) win.show();
    win.focus();
  }

  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', schedule);
  } else {
    schedule();
  }
}

function normalizeBubblePayload(payload) {
  if (typeof payload === 'string') {
    return { text: payload, source: 'manual' };
  }
  if (payload && typeof payload === 'object') {
    return {
      text: String(payload.text || ''),
      source: payload.source || 'manual',
    };
  }
  return { text: '', source: 'manual' };
}

function pushLive2DBubble(getMainWindow, payload, options = {}) {
  const { delayMs = 0, showWindow = false } = options;
  const win = getMainWindow();
  if (!win || win.isDestroyed()) return;

  const normalized = normalizeBubblePayload(payload);
  if (!normalized.text.trim()) return;

  const deliver = () => {
    if (win.isDestroyed()) return;
    win.webContents.send('live2d:bubble', normalized);
  };

  const schedule = () => {
    if (delayMs > 0) setTimeout(deliver, delayMs);
    else deliver();
  };

  if (showWindow && !win.isVisible()) {
    win.show();
  }

  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', schedule);
  } else {
    schedule();
  }
}

module.exports = {
  registerLive2DSchemes,
  registerLive2DProtocol,
  registerLive2DHandlers,
  pushLive2DCommand,
  pushLive2DBubble,
  findModel3Json,
  resolveModelFsPath,
  scanBundledModels,
};
