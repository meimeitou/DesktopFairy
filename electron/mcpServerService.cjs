const fs = require('fs');
const path = require('path');
const os = require('os');
const { app, dialog } = require('electron');
const { loadMcpToolDefinitions } = require('./agentMcpClient.cjs');

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
    description: '抓取网页内容（@modelcontextprotocol/server-fetch）',
    reference: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
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
  return {
    ...preset,
    ...server,
    id: preset.id,
    installSource: 'builtin',
    reference: server.reference || preset.reference,
    description: server.description || preset.description,
    shouldConfig: preset.shouldConfig,
  };
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

function getServersByIds(ids) {
  const set = new Set(ids || []);
  return listServers().filter((s) => set.has(s.id) && s.isActive !== false);
}

async function testMcpServer(server) {
  if (!server || server.isActive === false) {
    return { ok: false, message: '请先启用该 MCP 服务器' };
  }
  if (server.type && server.type !== 'stdio') {
    return { ok: false, message: '当前仅支持测试 stdio 类型 MCP' };
  }
  if (!server.command?.trim()) {
    return { ok: false, message: '未配置启动命令' };
  }

  let runtime = null;
  try {
    runtime = await loadMcpToolDefinitions([server]);
    const tools = (runtime.definitions || []).map((d) => d.function?.name).filter(Boolean);
    if (tools.length === 0) {
      return { ok: false, message: '连接成功，但未发现可用工具' };
    }
    return {
      ok: true,
      message: '连接成功',
      toolCount: tools.length,
      tools,
    };
  } catch (err) {
    return {
      ok: false,
      message: String(err?.message || err),
    };
  } finally {
    runtime?.dispose?.();
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
  getServersByIds,
  testMcpServer,
  BUILTIN_MCP_PRESETS,
};
