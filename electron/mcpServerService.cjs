const fs = require('fs');
const path = require('path');
const os = require('os');
const { app, dialog } = require('electron');

const MCP_STORE = () => path.join(app.getPath('userData'), 'da_mcp_servers.json');

const BUILTIN_MCP_PRESETS = [
  {
    id: 'builtin-mcp-filesystem',
    name: 'Filesystem',
    type: 'stdio',
    description: '读写本地文件（@modelcontextprotocol/server-filesystem）',
    reference: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    command: 'npx',
    args: [
      '-y',
      '@modelcontextprotocol/server-filesystem',
      path.join(os.homedir(), 'Desktop'),
    ],
    isActive: false,
    installSource: 'builtin',
    shouldConfig: true,
  },
  {
    id: 'builtin-mcp-fetch',
    name: 'Fetch',
    type: 'stdio',
    description:
      '抓取网页为 Markdown（mcp-server-fetch / uvx）。默认单次最多 5000 字符；支持 max_length 与 start_index 分页。Agent 未指定 max_length 时 DesktopFairy 自动使用 50000。',
    reference: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
    command: 'uvx',
    args: ['mcp-server-fetch'],
    env: { PYTHONIOENCODING: 'utf-8' },
    isActive: true,
    installSource: 'builtin',
  },
  {
    id: 'builtin-mcp-memory',
    name: 'Memory',
    type: 'stdio',
    description: '持久化知识图谱记忆（@modelcontextprotocol/server-memory）',
    reference: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    env: { MEMORY_FILE_PATH: path.join(app.getPath('userData'), 'mcp-memory.json') },
    isActive: false,
    installSource: 'builtin',
    shouldConfig: true,
  },
  {
    id: 'builtin-mcp-sequential',
    name: 'Sequential Thinking',
    type: 'stdio',
    description: '结构化推理（@modelcontextprotocol/server-sequential-thinking）',
    reference: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    isActive: true,
    installSource: 'builtin',
  },
];

function loadStore() {
  try {
    if (fs.existsSync(MCP_STORE())) {
      return JSON.parse(fs.readFileSync(MCP_STORE(), 'utf8'));
    }
  } catch {
    /* ignore */
  }
  return { servers: [] };
}

function saveStore(data) {
  fs.mkdirSync(path.dirname(MCP_STORE()), { recursive: true });
  fs.writeFileSync(MCP_STORE(), JSON.stringify(data, null, 2), 'utf8');
}

function mergePresetDefaults(server, preset) {
  if (!preset) return server;
  const merged = {
    ...preset,
    ...server,
    id: preset.id,
    installSource: 'builtin',
    reference: server.reference || preset.reference,
    description: server.description || preset.description,
    shouldConfig: preset.shouldConfig,
  };
  // Builtin preset command is canonical (not user-editable); always take it
  // from the preset so package renames/migrations propagate to existing installs.
  merged.command = preset.command;
  // For non-configurable builtins, args are also canonical. For shouldConfig
  // builtins (e.g. filesystem path), preserve the user's customized args.
  if (!preset.shouldConfig) {
    merged.args = preset.args ? [...preset.args] : [];
  }
  // Env: preset provides defaults (e.g. MEMORY_FILE_PATH); user customizations win.
  merged.env = { ...(preset.env || {}), ...(server.env || {}) };
  return merged;
}

function listServers() {
  const data = loadStore();
  const servers = Array.isArray(data.servers) ? data.servers : [];
  const byId = new Map(servers.map((s) => [s.id, s]));
  for (const preset of BUILTIN_MCP_PRESETS) {
    if (!byId.has(preset.id)) {
      byId.set(preset.id, { ...preset });
    } else {
      byId.set(preset.id, mergePresetDefaults(byId.get(preset.id), preset));
    }
  }
  return [...byId.values()];
}

function upsertServer(server) {
  if (!server?.id || !server?.name) throw new Error('Invalid MCP server');
  const preset = BUILTIN_MCP_PRESETS.find((p) => p.id === server.id);
  const next = preset ? mergePresetDefaults(server, preset) : server;
  const servers = listServers();
  const idx = servers.findIndex((s) => s.id === next.id);
  if (idx >= 0) servers[idx] = { ...servers[idx], ...next };
  else servers.push(next);
  saveStore({ servers });
  return next;
}

function deleteServer(id) {
  const preset = BUILTIN_MCP_PRESETS.find((p) => p.id === id);
  if (preset) {
    upsertServer({ ...listServers().find((s) => s.id === id) || preset, ...preset, isActive: false });
    return;
  }
  const servers = listServers().filter((s) => s.id !== id);
  saveStore({ servers });
}

function getServerById(id) {
  if (!id) return undefined;
  return listServers().find((s) => s.id === id);
}

function getServersByIds(ids) {
  const set = new Set(ids || []);
  return listServers().filter((s) => set.has(s.id) && s.isActive !== false);
}

async function testMcpServer(server) {
  if (!server || server.isActive === false) {
    return { ok: false, message: '请先启用该 MCP 服务器' };
  }
  if (!server.command?.trim() && !server.baseUrl?.trim()) {
    return { ok: false, message: '未配置启动命令或远程地址' };
  }

  const { getOrCreateClient } = require('./mcpRuntimeService.cjs');
  try {
    const client = await getOrCreateClient(server);
    const { tools } = await client.listTools();
    const names = (tools || []).map((t) => t.name).filter(Boolean);
    if (names.length === 0) {
      return { ok: false, message: '连接成功，但未发现可用工具' };
    }
    return {
      ok: true,
      message: '连接成功',
      toolCount: names.length,
      tools: names,
    };
  } catch (err) {
    return {
      ok: false,
      message: String(err?.message || err),
    };
  }
}

function registerMcpServerHandlers(ipcMain) {
  ipcMain.handle('mcp:servers:list', async () => listServers());

  ipcMain.handle('mcp:servers:save', async (_event, server) => upsertServer(server));

  ipcMain.handle('mcp:servers:delete', async (_event, { id }) => {
    if (!id) throw new Error('id required');
    deleteServer(String(id));
  });

  ipcMain.handle('mcp:servers:install_builtin', async (_event, { id }) => {
    const preset = BUILTIN_MCP_PRESETS.find((p) => p.id === id);
    if (!preset) throw new Error('Unknown builtin MCP');
    return upsertServer({ ...preset, isActive: true });
  });

  ipcMain.handle('mcp:servers:builtin_presets', async () =>
    BUILTIN_MCP_PRESETS.map(({ id, name, description, shouldConfig, reference }) => ({
      id,
      name,
      description,
      shouldConfig: !!shouldConfig,
      reference,
    }))
  );

  ipcMain.handle('mcp:servers:test', async (_event, server) => testMcpServer(server));

  ipcMain.handle('mcp:servers:pick_directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths?.[0]) return null;
    return result.filePaths[0];
  });
}

module.exports = {
  registerMcpServerHandlers,
  listServers,
  getServerById,
  getServersByIds,
  testMcpServer,
  upsertServer,
  deleteServer,
  BUILTIN_MCP_PRESETS,
};
