const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => {
    // Only allow specific IPC channels (security whitelist)
    const allowedChannels = [
      'reapply_window_float',
      'show_main_window',
      'hide_main_window',
      'toggle_click_through',
      'open_settings_window',
      'open_chat_window',
      'quit_app',
      'resize_main_window',
    ];

    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`IPC channel not allowed: ${channel}`);
  },

  // Window management APIs
  windowGetSize: () => ipcRenderer.invoke('window:get_size'),
  windowSetSize: (width, height) => ipcRenderer.invoke('window:set_size', { width, height }),
  windowGetPosition: () => ipcRenderer.invoke('window:get_position'),
  windowSetPosition: (x, y) => ipcRenderer.invoke('window:set_position', { x, y }),
});
