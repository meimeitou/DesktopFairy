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
      'open_chat_with_text',
      'quit_app',
      'resize_main_window',
      'get_shortcut',
      'set_shortcut',
      'chat:send',
      'chat:abort',
      'chat:session:load',
      'chat:session:save',
      'chat:list_models',
      'chat:check',
      'settings:sync',
      'open_chat_with_payload',
      'selection:copy',
      'selection:open_url',
      'selection:resize_tip',
      'live2d:list_models',
      'live2d:switch_model',
      'live2d:command',
      'live2d:bubble',
      'live2d:inspect_model',
      'live2d:select_model_dir',
      'selection:check_accessibility',
      'selection:prompt_accessibility',
      'file:select',
      'file:read',
      'file:stat_path',
      'screenshot:capture',
      'screenshot:capture_to_chat',
      'screenshot:copy_text',
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
  screenGetCursorPoint: () => ipcRenderer.invoke('screen:get_cursor_point'),

  // Event listeners
  onChatPrefill: (callback) => {
    ipcRenderer.on('chat:prefill', (_event, payload) => callback(payload));
  },

  onChatNavigate: (callback) => {
    const listener = (_event, view) => callback(view);
    ipcRenderer.on('chat:navigate', listener);
    return () => ipcRenderer.removeListener('chat:navigate', listener);
  },

  onSettingsUpdated: (callback) => {
    const listener = (_event, settings) => callback(settings);
    ipcRenderer.on('settings:updated', listener);
    return () => ipcRenderer.removeListener('settings:updated', listener);
  },

  onMainWindowLayoutChanged: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('main-window:layout-changed', listener);
    return () => ipcRenderer.removeListener('main-window:layout-changed', listener);
  },

  // Shortcut management
  getShortcut: () => ipcRenderer.invoke('get_shortcut'),
  setShortcut: (shortcut) => ipcRenderer.invoke('set_shortcut', shortcut),

  // Live2D commands pushed from main process
  onLive2DCommand: (callback) => {
    const listener = (_event, cmd) => callback(cmd);
    ipcRenderer.on('live2d:command', listener);
    return () => ipcRenderer.removeListener('live2d:command', listener);
  },

  onLive2DBubble: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('live2d:bubble', listener);
    return () => ipcRenderer.removeListener('live2d:bubble', listener);
  },

  // Model switch pushed from main process (tray menu)
  onSwitchModel: (callback) => {
    const listener = (_event, modelPath) => callback(modelPath);
    ipcRenderer.on('live2d:switch_model', listener);
    return () => ipcRenderer.removeListener('live2d:switch_model', listener);
  },

  // Chat streaming events from main process
  onChatStreamChunk: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('chat:stream:chunk', listener);
    return () => ipcRenderer.removeListener('chat:stream:chunk', listener);
  },
  onChatStreamDone: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('chat:stream:done', listener);
    return () => ipcRenderer.removeListener('chat:stream:done', listener);
  },
  onChatStreamError: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('chat:stream:error', listener);
    return () => ipcRenderer.removeListener('chat:stream:error', listener);
  },
});
