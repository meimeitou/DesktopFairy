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
      'get_chat_shortcut',
      'set_chat_shortcut',
      'chat:send',
      'chat:abort',
      'chat:session:load',
      'chat:session:save',
      'chat:tool-result:read',
      'chat:log:load',
      'chat:topics:list',
      'chat:topics:create',
      'chat:topics:delete',
      'chat:topics:rename',
      'chat:topics:setActive',
      'chat:topics:updateOrder',
      'chat:list_models',
      'chat:check',
      'settings:sync',
      'open_chat_with_payload',
      'selection:copy',
      'selection:open_url',
      'selection:resize_tip',
      'selection:hide_tip',
      'live2d:list_models',
      'live2d:switch_model',
      'live2d:command',
      'live2d:bubble',
      'live2d:inspect_model',
      'live2d:select_model_dir',
      'live2d:validate_model_path',
      'selection:check_accessibility',
      'selection:prompt_accessibility',
      'selection:retry_hook',
      'file:select',
      'file:read',
      'file:stat_path',
      'screenshot:capture',
      'screenshot:capture_to_chat',
      'screenshot:copy_text',
      'pty:create',
      'pty:input',
      'pty:resize',
      'pty:kill',
      'pty:busy',
      'ssh:create',
      'ssh:input',
      'ssh:resize',
      'ssh:kill',
      'ssh:busy',
      'ssh:test',
      'ssh:import_configs',
      'agent:run',
      'agent:abort',
      'ai:stream_open',
      'ai:stream_attach',
      'ai:stream_detach',
      'ai:stream_abort',
      'ai:tool:bypass_approval',
      'agent:tool:approve',
      'agent:tool:bypass_approval',
      'agent:skills:scan',
      'agent:skills:open_dir',
      'agent:skills:import_directory',
      'mcp:servers:list',
      'mcp:servers:save',
      'mcp:servers:delete',
      'mcp:servers:install_builtin',
      'mcp:servers:builtin_presets',
      'mcp:servers:pick_directory',
      'mcp:servers:test',
      'mcp:servers:restart',
      'mcp:servers:stop',
      'mcp:servers:status',
      'mcp:servers:logs',
      'mcp:servers:abort_tool',
      'agent:avatar:select',
      'agent:avatar:resolve',
      'agent:avatar:clear_image',
      'terminal:agent:stop',
      'websearch:test',
      'browser:open',
      'project:list',
      'project:create',
      'project:update',
      'project:delete',
      'project:set_active',
      'project:pick_directory',
      'project:save_store',
      'code_cli:write_config',
      'code_cli:check_binary',
      'code_cli:build_command',
      'code_cli:read_config_files',
      'code_cli:install',
      'code_cli:build_launch_command',
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
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('chat:prefill', listener);
    return () => ipcRenderer.removeListener('chat:prefill', listener);
  },

  onChatNavigate: (callback) => {
    const listener = (_event, view) => callback(view);
    ipcRenderer.on('chat:navigate', listener);
    return () => ipcRenderer.removeListener('chat:navigate', listener);
  },

  onCodeAction: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('code:action', listener);
    return () => ipcRenderer.removeListener('code:action', listener);
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

  onChatWindowFullscreenChanged: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('chat:window:fullscreen_changed', listener);
    return () => ipcRenderer.removeListener('chat:window:fullscreen_changed', listener);
  },

  onChatWindowMaximizedChanged: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('chat:window:maximized_changed', listener);
    return () => ipcRenderer.removeListener('chat:window:maximized_changed', listener);
  },

  // Load settings from disk synchronously (used as localStorage fallback on startup)
  loadSettingsFromDisk: () => ipcRenderer.sendSync('settings:load:sync'),

  // Shortcut management
  getShortcut: () => ipcRenderer.invoke('get_shortcut'),
  setShortcut: (shortcut) => ipcRenderer.invoke('set_shortcut', shortcut),
  getChatShortcut: () => ipcRenderer.invoke('get_chat_shortcut'),
  setChatShortcut: (shortcut) => ipcRenderer.invoke('set_chat_shortcut', shortcut),

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

  onSelectionTipText: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('selection:tip_text', listener);
    return () => ipcRenderer.removeListener('selection:tip_text', listener);
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

  onAgentStreamTool: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('agent:stream:tool', listener);
    return () => ipcRenderer.removeListener('agent:stream:tool', listener);
  },

  onAiStreamChunk: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('ai:stream:chunk', listener);
    return () => ipcRenderer.removeListener('ai:stream:chunk', listener);
  },
  onAiStreamDone: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('ai:stream:done', listener);
    return () => ipcRenderer.removeListener('ai:stream:done', listener);
  },
  onAiStreamError: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('ai:stream:error', listener);
    return () => ipcRenderer.removeListener('ai:stream:error', listener);
  },

  // PTY events from main process
  onPtyOutput: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('pty:output', listener);
    return () => ipcRenderer.removeListener('pty:output', listener);
  },
  onPtyExit: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('pty:exit', listener);
    return () => ipcRenderer.removeListener('pty:exit', listener);
  },

  // SSH events from main process
  onSshOutput: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('ssh:output', listener);
    return () => ipcRenderer.removeListener('ssh:output', listener);
  },
  onSshExit: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('ssh:exit', listener);
    return () => ipcRenderer.removeListener('ssh:exit', listener);
  },

  // MCP runtime events from main process
  onMcpStatusChanged: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('mcp:servers:status_changed', listener);
    return () => ipcRenderer.removeListener('mcp:servers:status_changed', listener);
  },
  onMcpLog: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('mcp:servers:log', listener);
    return () => ipcRenderer.removeListener('mcp:servers:log', listener);
  },
  onMcpToolsChanged: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('mcp:servers:tools_changed', listener);
    return () => ipcRenderer.removeListener('mcp:servers:tools_changed', listener);
  },
  onMcpToolProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('mcp:tool:progress', listener);
    return () => ipcRenderer.removeListener('mcp:tool:progress', listener);
  },

  onBrowserOpenTab: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('browser:open_tab', listener);
    return () => ipcRenderer.removeListener('browser:open_tab', listener);
  },
});
