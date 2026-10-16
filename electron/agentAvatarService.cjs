const fs = require('fs');
const path = require('path');
const { app, dialog } = require('electron');

const AVATAR_DIR = () => path.join(app.getPath('userData'), 'agent-avatar');

function registerAgentAvatarHandlers(ipcMain) {
  ipcMain.handle('agent:avatar:select', async (_event, agentId) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
      ],
    });
    if (result.canceled || !result.filePaths?.[0]) return null;

    const safeId = String(agentId || 'current').replace(/[^a-zA-Z0-9_-]/g, '_');
    const src = result.filePaths[0];
    const ext = path.extname(src).toLowerCase() || '.png';
    fs.mkdirSync(AVATAR_DIR(), { recursive: true });
    // Remove previous avatars of the same agent (any extension).
    for (const f of fs.readdirSync(AVATAR_DIR())) {
      const stem = f.replace(/\.[^.]+$/, '');
      if (stem === safeId) {
        try {
          fs.unlinkSync(path.join(AVATAR_DIR(), f));
        } catch {
          /* ignore */
        }
      }
    }
    const dest = path.join(AVATAR_DIR(), `${safeId}${ext}`);
    await fs.promises.copyFile(src, dest);
    return `img:${safeId}${ext}`;
  });

  ipcMain.handle('agent:avatar:resolve', async (_event, avatar) => {
    const v = String(avatar || '');
    if (!v.startsWith('img:')) return null;
    const rel = v.slice(4);
    const full = path.join(AVATAR_DIR(), rel);
    // Containment check: `img:../..` must not escape the avatar directory.
    const AVATAR_PREFIX = AVATAR_DIR() + path.sep;
    if (!path.resolve(full).startsWith(AVATAR_PREFIX)) return null;
    if (!fs.existsSync(full)) return null;
    const data = await fs.promises.readFile(full);
    const ext = path.extname(full).replace('.', '') || 'png';
    const mime = ext === 'jpg' ? 'jpeg' : ext;
    return `data:image/${mime};base64,${data.toString('base64')}`;
  });

  ipcMain.handle('agent:avatar:clear_image', async () => null);
}

module.exports = { registerAgentAvatarHandlers, AVATAR_DIR };
