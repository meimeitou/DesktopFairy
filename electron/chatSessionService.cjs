const fs = require('fs');

function emptySession() {
  return {
    version: 1,
    updatedAt: Date.now(),
    messages: [],
    draftInput: '',
    draftAttachments: [],
  };
}

function registerChatSessionHandlers({ ipcMain, sessionPath }) {
  ipcMain.handle('chat:session:load', async () => {
    const filePath = sessionPath();
    try {
      if (!fs.existsSync(filePath)) return emptySession();
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data && typeof data === 'object' ? data : emptySession();
    } catch (e) {
      console.warn('Failed to load chat session:', e);
      return emptySession();
    }
  });

  ipcMain.handle('chat:session:save', async (_event, session) => {
    const filePath = sessionPath();
    try {
      fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
      return { ok: true };
    } catch (e) {
      console.warn('Failed to persist chat session:', e);
      return { ok: false };
    }
  });
}

module.exports = { registerChatSessionHandlers };
