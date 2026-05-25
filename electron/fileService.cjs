const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.markdown', '.json', '.js', '.ts', '.tsx', '.jsx',
  '.css', '.html', '.xml', '.yaml', '.yml', '.csv', '.log', '.c', '.cpp',
  '.h', '.hpp', '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift',
  '.sh', '.bash', '.zsh', '.sql', '.toml', '.ini', '.cfg', '.env',
]);

const IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp',
]);

const MAX_TEXT_BYTES = 512 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function getExt(filePath) {
  return path.extname(filePath).toLowerCase();
}

function classifyFile(filePath) {
  const ext = getExt(filePath);
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (TEXT_EXTENSIONS.has(ext)) return 'text';
  return 'other';
}

async function isTextFile(filePath) {
  try {
    const fd = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(4096);
    const { bytesRead } = await fd.read(buffer, 0, 4096, 0);
    await fd.close();
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function resolveFileKind(filePath) {
  const kind = classifyFile(filePath);
  if (kind === 'other' && (await isTextFile(filePath))) return 'text';
  return kind;
}

function toMetadata(filePath) {
  const stats = fs.statSync(filePath);
  const ext = getExt(filePath);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: path.basename(filePath),
    path: filePath,
    ext,
    size: stats.size,
    kind: classifyFile(filePath),
  };
}

async function selectFiles(_event, options = {}) {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Documents & Images',
        extensions: [
          'txt', 'md', 'markdown', 'json', 'pdf', 'doc', 'docx',
          'png', 'jpg', 'jpeg', 'gif', 'webp', 'csv', 'xml', 'yaml', 'yml',
        ],
      },
      { name: 'All Files', extensions: ['*'] },
    ],
    ...options,
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const files = await Promise.all(
    result.filePaths.map(async (filePath) => {
      const meta = toMetadata(filePath);
      meta.kind = await resolveFileKind(filePath);
      return meta;
    })
  );
  return files;
}

async function readFileContent(_event, fileMeta) {
  const filePath = fileMeta?.path;
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('File not found');
  }

  const kind = fileMeta.kind || (await resolveFileKind(filePath));
  const stats = fs.statSync(filePath);

  if (kind === 'image') {
    if (stats.size > MAX_IMAGE_BYTES) {
      throw new Error(`Image too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB)`);
    }
    const data = await fs.promises.readFile(filePath);
    const ext = getExt(filePath).replace('.', '') || 'png';
    const mime = ext === 'jpg' ? 'jpeg' : ext;
    return {
      kind: 'image',
      dataUrl: `data:image/${mime};base64,${data.toString('base64')}`,
      name: path.basename(filePath),
      size: stats.size,
    };
  }

  if (stats.size > MAX_TEXT_BYTES) {
    throw new Error(`File too large (max ${MAX_TEXT_BYTES / 1024}KB)`);
  }

  const text = await fs.promises.readFile(filePath, 'utf8');
  return {
    kind: 'text',
    text,
    name: path.basename(filePath),
    size: stats.size,
  };
}

async function statFilePath(_event, filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('File not found');
  }
  const meta = toMetadata(filePath);
  meta.kind = await resolveFileKind(filePath);
  return meta;
}

function registerFileHandlers(ipcMain) {
  ipcMain.handle('file:select', selectFiles);
  ipcMain.handle('file:read', readFileContent);
  ipcMain.handle('file:stat_path', statFilePath);
}

module.exports = { registerFileHandlers, IMAGE_EXTENSIONS, TEXT_EXTENSIONS };
