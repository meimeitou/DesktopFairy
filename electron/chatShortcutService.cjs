const { globalShortcut } = require('electron');

let currentChatShortcut = 'Command+R';
let toggleHandler = null;

const registerChatShortcut = (shortcut, toggle) => {
  if (process.platform !== 'darwin') return false;

  if (currentChatShortcut && currentChatShortcut !== shortcut) {
    globalShortcut.unregister(currentChatShortcut);
  }
  currentChatShortcut = shortcut;
  if (typeof toggle === 'function') toggleHandler = toggle;

  if (!shortcut) {
    return true;
  }

  const ok = globalShortcut.register(currentChatShortcut, () => {
    if (typeof toggleHandler === 'function') toggleHandler();
  });
  if (!ok) {
    console.warn(`[chat-shortcut] failed to register shortcut: ${currentChatShortcut}`);
  }
  return ok;
};

const applyChatShortcutSettings = (settings, deps) => {
  if (typeof deps?.toggle === 'function') toggleHandler = deps.toggle;

  const nextShortcut =
    (typeof settings?.chatShortcut === 'string' && settings.chatShortcut.trim()) ||
    currentChatShortcut;

  return registerChatShortcut(nextShortcut, toggleHandler);
};

const stopChatShortcut = () => {
  if (currentChatShortcut) {
    globalShortcut.unregister(currentChatShortcut);
  }
};

const getCurrentChatShortcut = () => currentChatShortcut;

module.exports = {
  applyChatShortcutSettings,
  stopChatShortcut,
  getCurrentChatShortcut,
};
