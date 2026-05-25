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

  const preferred = `${path.basename(dir)}.model3.json`;
  let chosen = matches.includes(preferred) ? preferred : null;
  let warning = null;

  if (!chosen) {
    if (matches.length === 1) {
      chosen = matches[0];
    } else {
      chosen = [...matches].sort()[0];
      warning = `目录含多个 model3.json，已选用 ${chosen}`;
    }
  }

  const fullPath = path.join(dir, chosen);
  if (!fs.existsSync(fullPath)) {
    return { error: '模型配置文件不存在' };
  }

  return {
    name: path.basename(dir),
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
      if (!filePath || !fs.existsSync(filePath)) {
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
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('live2d:command', cmd);
    }
  });

  ipcMain.handle('live2d:inspect_model', async (_event, modelPath) => {
    const fullPath = resolveModelFsPath(modelPath, publicRoot);
    if (!fullPath || !fs.existsSync(fullPath)) {
      return { expressions: [], motionGroups: [] };
    }
    return inspectModelFile(fullPath);
  });

  ipcMain.handle('live2d:select_model_dir', async (event) => {
    const win = event.sender
      ? BrowserWindow.fromWebContents(event.sender)
      : null;
    const result = await dialog.showOpenDialog(win || undefined, {
      properties: ['openDirectory'],
      title: '选择 Live2D 模型目录',
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }
    const picked = findModel3Json(result.filePaths[0]);
    if (picked.error) {
      return { error: picked.error };
    }
    return picked;
  });
}

module.exports = {
  registerLive2DSchemes,
  registerLive2DProtocol,
  registerLive2DHandlers,
  findModel3Json,
  resolveModelFsPath,
  scanBundledModels,
};
