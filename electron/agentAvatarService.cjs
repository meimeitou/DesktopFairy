const fs = require('fs');
const path = require('path');
const { app, dialog } = require('electron');

const AVATAR_DIR = () => path.join(app.getPath('userData'), 'agent-avatar');
const AVATAR_FILE = () => path.join(AVATAR_DIR(), 'current');

function registerAgentAvatarHandlers(ipcMain) {
  ipcMain.handle('agent:avatar:select', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
      ],
    });
    if (result.canceled || !result.filePaths?.[0]) return null;

    const src = result.filePaths[0];
    const ext = path.extname(src).toLowerCase() || '.png';
    fs.mkdirSync(AVATAR_DIR(), { recursive: true });
    for (const f of fs.readdirSync(AVATAR_DIR())) {
      if (f.startsWith('current')) {
        try {
          fs.unlinkSync(path.join(AVATAR_DIR(), f));
        } catch {
          /* ignore */
        }
      }
    }
    const dest = `${AVATAR_FILE()}${ext}`;
    await fs.promises.copyFile(src, dest);
    return `img:current${ext}`;
  });

  ipcMain.handle('agent:avatar:resolve', async (_event, avatar) => {
    const v = String(avatar || '');
    if (!v.startsWith('img:')) return null;
    const rel = v.slice(4);
    const full = path.join(AVATAR_DIR(), rel);
    if (!fs.existsSync(full)) return null;
    const data = await fs.promises.readFile(full);
    const ext = path.extname(full).replace('.', '') || 'png';
    const mime = ext === 'jpg' ? 'jpeg' : ext;
    return `data:image/${mime};base64,${data.toString('base64')}`;
  });

  ipcMain.handle('agent:avatar:clear_image', async () => null);
}

module.exports = { registerAgentAvatarHandlers, AVATAR_DIR };
