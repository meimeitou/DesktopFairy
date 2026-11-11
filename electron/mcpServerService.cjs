const fs = require('fs');
const path = require('path');
const { app, dialog } = require('electron');

const MCP_STORE = () => path.join(app.getPath('userData'), 'da_mcp_servers.json');
/** Bump 3: builtin MCP presets removed — existing builtin installs are purged. */
const TOOL_DEFAULTS_REV = 3;

function loadStore() {
  try {
    if (fs.existsSync(MCP_STORE())) {
      const parsed = JSON.parse(fs.readFileSync(MCP_STORE(), 'utf8'));
      return migrateStore(parsed);
    }
  } catch {
    /* ignore */
  }
  return { servers: [], toolDefaultsRev: TOOL_DEFAULTS_REV };
}

function migrateStore(data) {
  const servers = Array.isArray(data?.servers) ? data.servers : [];
  let rev = Number(data?.toolDefaultsRev) || 0;
  if (rev >= TOOL_DEFAULTS_REV) {
    return { servers, toolDefaultsRev: rev };
  }
  if (rev < 3) {
    // Builtin presets no longer exist; drop their installed records.
    const kept = servers.filter((s) => s?.installSource !== 'builtin');
    saveStore({ servers: kept, toolDefaultsRev: 3 });
    return { servers: kept, toolDefaultsRev: 3 };
  }
  const next = { servers, toolDefaultsRev: TOOL_DEFAULTS_REV };
  saveStore(next);
  return next;
}

function saveStore(data) {
  fs.mkdirSync(path.dirname(MCP_STORE()), { recursive: true });
  fs.writeFileSync(MCP_STORE(), JSON.stringify(data, null, 2), 'utf8');
}

function persistServers(servers) {
  saveStore({ servers, toolDefaultsRev: TOOL_DEFAULTS_REV });
}

function listServers() {
  const data = loadStore();
  return Array.isArray(data.servers) ? data.servers : [];
}

function upsertServer(server) {
  if (!server?.id || !server?.name) throw new Error('Invalid MCP server');
  const servers = listServers();
  const idx = servers.findIndex((s) => s.id === server.id);
  if (idx >= 0) servers[idx] = { ...servers[idx], ...server };
  else servers.push(server);
  persistServers(servers);
  return server;
}

function deleteServer(id) {
  const servers = listServers().filter((s) => s.id !== id);
  persistServers(servers);
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

/** Fetch server content from a live server client; throws on missing/disconnected. */
async function requireLiveClient(id) {
  const server = getServerById(String(id || ''));
  if (!server) throw new Error(`MCP server ${id} not found`);
  if (server.isActive === false) {
    throw new Error(`MCP 服务器 ${server.name} 未启用`);
  }
  const { getOrCreateClient } = require('./mcpRuntimeService.cjs');
  return getOrCreateClient(server);
}

/**
 * Parse Claude Desktop / Cursor style MCP config JSON:
 * { "mcpServers": { key: { command, args, env } | { url, headers } } }
 * A bare server map (no mcpServers wrapper) is also accepted.
 */
function parseMcpServersJson(json) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`JSON 解析失败：${err instanceof Error ? err.message : String(err)}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON 顶层必须是对象');
  }
  const map = parsed.mcpServers && typeof parsed.mcpServers === 'object' && !Array.isArray(parsed.mcpServers)
    ? parsed.mcpServers
    : parsed;
  const entries = Object.entries(map).filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v));
  if (entries.length === 0) {
    throw new Error('未找到 MCP 服务器定义（需要 mcpServers 字段或顶层服务器 map）');
  }
  return entries;
}

function buildImportedServer(key, cfg, index) {
  const env = cfg.env && typeof cfg.env === 'object' && !Array.isArray(cfg.env)
    ? Object.fromEntries(Object.entries(cfg.env).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
    : undefined;
  const headers = cfg.headers && typeof cfg.headers === 'object' && !Array.isArray(cfg.headers)
    ? Object.fromEntries(Object.entries(cfg.headers).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
    : undefined;
  const id = `mcp_${Date.now().toString(36)}_${index}`;
  if (typeof cfg.url === 'string' && cfg.url.trim()) {
    let parsedUrl;
    try {
      parsedUrl = new URL(cfg.url.trim());
    } catch {
      throw new Error(`服务器 "${key}" 的 url 不是合法地址: ${cfg.url.trim()}`);
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error(`服务器 "${key}" 的 url 仅支持 http/https`);
    }
    return {
      id,
      name: key,
      type: 'streamableHttp',
      baseUrl: cfg.url.trim(),
      headers,
      isActive: true,
      installSource: 'manual',
    };
  }
  const command = typeof cfg.command === 'string' ? cfg.command.trim() : '';
  if (!command) {
    throw new Error(`服务器 "${key}" 缺少 command 或 url`);
  }
  return {
    id,
    name: key,
    type: 'stdio',
    command,
    args: Array.isArray(cfg.args) ? cfg.args.map((a) => String(a)) : [],
    env,
    isActive: true,
    installSource: 'manual',
  };
}

const MCP_IMPORT_MAX_SERVERS = 50;

function importServersFromJson(json) {
  const entries = parseMcpServersJson(json);
  if (entries.length > MCP_IMPORT_MAX_SERVERS) {
    throw new Error(`单次导入不能超过 ${MCP_IMPORT_MAX_SERVERS} 个服务器（当前 ${entries.length} 个）`);
  }
  const servers = entries.map(([key, cfg], i) => buildImportedServer(key, cfg, i));
  // Validate all entries first, then persist in one write (N upserts = N full disk writes).
  const existing = listServers();
  const byId = new Map(existing.map((s) => [s.id, s]));
  for (const server of servers) {
    byId.set(server.id, server); // id collisions overwrite, same as upsert semantics
  }
  persistServers([...byId.values()]);
  return { imported: servers.length };
}



function registerMcpServerHandlers(ipcMain) {
  ipcMain.handle('mcp:servers:list', async () => listServers());

  ipcMain.handle('mcp:servers:save', async (_event, server) => upsertServer(server));

  ipcMain.handle('mcp:servers:delete', async (_event, { id }) => {
    if (!id) throw new Error('id required');
    deleteServer(String(id));
  });

  ipcMain.handle('mcp:servers:test', async (_event, server) => testMcpServer(server));

  ipcMain.handle('mcp:servers:instructions', async (_event, { id }) => {
    const client = await requireLiveClient(id);
    return client.getInstructions() ?? '';
  });

  ipcMain.handle('mcp:servers:tools', async (_event, { id }) => {
    const client = await requireLiveClient(id);
    const { tools } = await client.listTools();
    return (tools || []).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
  });

  ipcMain.handle('mcp:servers:prompts', async (_event, { id }) => {
    const client = await requireLiveClient(id);
    try {
      const { prompts } = await client.listPrompts();
      return (prompts || []).map((p) => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments,
      }));
    } catch {
      return []; // server does not support prompts
    }
  });

  ipcMain.handle('mcp:servers:resources', async (_event, { id }) => {
    const client = await requireLiveClient(id);
    try {
      const { resources } = await client.listResources();
      return (resources || []).map((r) => ({
        uri: r.uri,
        name: r.name,
        mimeType: r.mimeType,
      }));
    } catch {
      return []; // server does not support resources
    }
  });

  ipcMain.handle('mcp:servers:import_json', async (_event, { json }) => {
    if (typeof json !== 'string' || !json.trim()) {
      throw new Error('json required');
    }
    return importServersFromJson(json);
  });

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
  importServersFromJson,
};

