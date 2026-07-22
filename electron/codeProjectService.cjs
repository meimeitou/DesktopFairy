const fs = require('fs');
const path = require('path');
const { dialog, BrowserWindow } = require('electron');

function ensureDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  } catch (e) {
    console.warn('[codeProject] mkdir failed:', dirPath, e);
  }
}

function emptyStore() {
  return { version: 1, activeProjectId: null, projects: [], cliConfigs: {} };
}

function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeStore(raw) {
  const base = emptyStore();
  if (!raw || typeof raw !== 'object') return base;
  const projects = Array.isArray(raw.projects)
    ? raw.projects.filter(
        (p) =>
          p &&
          typeof p.id === 'string' &&
          typeof p.name === 'string' &&
          typeof p.path === 'string',
      )
    : [];
  return {
    version: 1,
    activeProjectId: typeof raw.activeProjectId === 'string' ? raw.activeProjectId : null,
    projects,
    cliConfigs: raw.cliConfigs && typeof raw.cliConfigs === 'object' ? raw.cliConfigs : {},
  };
}

function createCodeProjectService({ storePath }) {
  function readStore() {
    try {
      if (!fs.existsSync(storePath())) return emptyStore();
      const raw = JSON.parse(fs.readFileSync(storePath(), 'utf8'));
      return normalizeStore(raw);
    } catch (e) {
      console.warn('[codeProject] read failed:', e);
      return emptyStore();
    }
  }

  function writeStore(store) {
    ensureDir(path.dirname(storePath()));
    fs.writeFileSync(storePath(), JSON.stringify(store, null, 2), 'utf8');
  }

  function getParentWindow() {
    return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;
  }

  return {
    readStore,
    writeStore,
    registerHandlers(ipcMain) {
      ipcMain.handle('project:list', async () => readStore());

      ipcMain.handle('project:create', async (_event, payload) => {
        const name = String(payload?.name || '').trim();
        const projectPath = String(payload?.path || '').trim();
        const description =
          typeof payload?.description === 'string' ? payload.description.trim() : undefined;
        if (!name) return { ok: false, error: '项目名称不能为空' };
        if (!projectPath) return { ok: false, error: '项目目录不能为空' };
        if (!fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) {
          return { ok: false, error: '目录不存在或不是文件夹' };
        }
        const now = Date.now();
        const project = {
          id: genId(),
          name,
          path: projectPath,
          description: description || undefined,
          createdAt: now,
          updatedAt: now,
          lastOpenedAt: now,
        };
        const store = readStore();
        store.projects.unshift(project);
        store.activeProjectId = project.id;
        writeStore(store);
        return { ok: true, project, store };
      });

      ipcMain.handle('project:update', async (_event, payload) => {
        const id = String(payload?.id || '');
        const store = readStore();
        const project = store.projects.find((p) => p.id === id);
        if (!project) return { ok: false, error: '项目不存在' };
        if (typeof payload?.name === 'string' && payload.name.trim()) {
          project.name = payload.name.trim();
        }
        if (typeof payload?.description === 'string') {
          project.description = payload.description.trim() || undefined;
        }
        if (typeof payload?.path === 'string' && payload.path.trim()) {
          const nextPath = payload.path.trim();
          if (!fs.existsSync(nextPath) || !fs.statSync(nextPath).isDirectory()) {
            return { ok: false, error: '目录不存在或不是文件夹' };
          }
          project.path = nextPath;
        }
        project.updatedAt = Date.now();
        writeStore(store);
        return { ok: true, project, store };
      });

      ipcMain.handle('project:delete', async (_event, { id }) => {
        const store = readStore();
        const idx = store.projects.findIndex((p) => p.id === id);
        if (idx < 0) return { ok: false, error: '项目不存在' };
        store.projects.splice(idx, 1);
        if (store.activeProjectId === id) {
          store.activeProjectId = store.projects[0]?.id ?? null;
        }
        writeStore(store);
        return { ok: true, store };
      });

      ipcMain.handle('project:set_active', async (_event, { id }) => {
        const store = readStore();
        const project = store.projects.find((p) => p.id === id);
        if (!project) return { ok: false, error: '项目不存在' };
        store.activeProjectId = id;
        project.lastOpenedAt = Date.now();
        writeStore(store);
        return { ok: true, store };
      });

      ipcMain.handle('project:pick_directory', async () => {
        const win = getParentWindow();
        const result = await dialog.showOpenDialog(win || undefined, {
          properties: ['openDirectory', 'createDirectory'],
        });
        if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true };
        return { ok: true, path: result.filePaths[0] };
      });

      ipcMain.handle('project:save_store', async (_event, { store: incoming }) => {
        const normalized = normalizeStore(incoming);
        writeStore(normalized);
        return { ok: true, store: normalized };
      });
    },
  };
}

module.exports = { createCodeProjectService };
