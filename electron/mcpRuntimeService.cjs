const { app, BrowserWindow, net } = require('electron');
const crypto = require('crypto');

// Lazy-loaded MCP SDK modules (ESM, loaded via dynamic import).
let sdkModules = null;

async function loadSdk() {
  if (sdkModules) return sdkModules;
  const [
    clientMod,
    stdioMod,
    sseMod,
    httpMod,
    typesMod,
  ] = await Promise.all([
    import('@modelcontextprotocol/sdk/client/index.js'),
    import('@modelcontextprotocol/sdk/client/stdio.js'),
    import('@modelcontextprotocol/sdk/client/sse.js'),
    import('@modelcontextprotocol/sdk/client/streamableHttp.js'),
    import('@modelcontextprotocol/sdk/types.js'),
  ]);
  sdkModules = {
    Client: clientMod.Client,
    StdioClientTransport: stdioMod.StdioClientTransport,
    SSEClientTransport: sseMod.SSEClientTransport,
    StreamableHTTPClientTransport: httpMod.StreamableHTTPClientTransport,
    ToolListChangedNotificationSchema: typesMod.ToolListChangedNotificationSchema,
    LoggingMessageNotificationSchema: typesMod.LoggingMessageNotificationSchema,
  };
  return sdkModules;
}

// Lazy import to avoid circular dependency with mcpServerService.cjs.
function getMcpServerService() {
  return require('./mcpServerService.cjs');
}

const MCP_CONNECT_TIMEOUT_MS = 180_000;
const DEFAULT_TOOL_TIMEOUT_MS = 60_000;
const LOG_BUFFER_LIMIT = 200;

class ServerLogBuffer {
  constructor(limit = LOG_BUFFER_LIMIT) {
    this.limit = limit;
    this.buffers = new Map();
  }

  append(serverKey, entry) {
    if (!this.buffers.has(serverKey)) {
      this.buffers.set(serverKey, []);
    }
    const arr = this.buffers.get(serverKey);
    arr.push(entry);
    if (arr.length > this.limit) {
      arr.shift();
    }
  }

  get(serverKey) {
    return this.buffers.get(serverKey) || [];
  }

  remove(serverKey) {
    this.buffers.delete(serverKey);
  }

  clear() {
    this.buffers.clear();
  }
}

const clients = new Map(); // serverKey -> { client, server }
const pendingClients = new Map(); // serverKey -> Promise<Client>
const activeToolCalls = new Map(); // callId -> AbortController
const statusMap = new Map(); // serverId -> { state, lastError, checkedAt }
const serverLogs = new ServerLogBuffer();

function getServerKey(server) {
  const { id, command, args, baseUrl, headers, env } = server || {};
  return JSON.stringify({
    id,
    command,
    args: Array.isArray(args) ? args : [],
    baseUrl,
    headers: headers || {},
    env: env || {},
  });
}

function isServerKeyForId(serverKey, serverId) {
  try {
    return JSON.parse(serverKey).id === serverId;
  } catch {
    return false;
  }
}

function broadcast(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    try {
      if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        win.webContents.send(channel, payload);
      }
    } catch {
      /* ignore */
    }
  }
}

function emitStatus(serverId, state, error) {
  const lastError = state === 'error' ? (error instanceof Error ? error.message : String(error || 'Unknown error')) : undefined;
  const entry = { state, lastError, checkedAt: Date.now() };
  statusMap.set(serverId, entry);
  broadcast('mcp:servers:status_changed', { serverId, ...entry });
}

function emitLog(server, entry) {
  const serverKey = getServerKey(server);
  serverLogs.append(serverKey, entry);
  broadcast('mcp:servers:log', { serverId: server.id, ...entry });
}

async function initTransport(server) {
  const sdk = await loadSdk();

  if (server.type === 'stdio' || (!server.type && server.command)) {
    if (!server.command?.trim()) {
      throw new Error('MCP stdio server has no command');
    }
    const transport = new sdk.StdioClientTransport({
      command: server.command,
      args: server.args || [],
      env: { ...process.env, ...(server.env || {}) },
      stderr: 'pipe',
    });
    transport.stderr?.on('data', (data) => {
      const text = data.toString().trim();
      if (text) {
        emitLog(server, { timestamp: Date.now(), level: 'stderr', message: text, source: 'stdio' });
      }
    });
    return transport;
  }

  if (server.baseUrl) {
    const url = new URL(server.baseUrl);
    const headers = server.headers || {};

    if (server.type === 'streamableHttp') {
      return new sdk.StreamableHTTPClientTransport(url, {
        fetch: async (fetchUrl, init) => net.fetch(typeof fetchUrl === 'string' ? fetchUrl : fetchUrl.toString(), init),
        requestInit: { headers },
      });
    }

    // Default remote transport is SSE.
    return new sdk.SSEClientTransport(url, {
      eventSourceInit: {
        fetch: async (fetchUrl, init) => net.fetch(typeof fetchUrl === 'string' ? fetchUrl : fetchUrl.toString(), init),
      },
      requestInit: { headers },
    });
  }

  throw new Error('MCP server must provide command (stdio) or baseUrl (sse/streamableHttp)');
}

async function setupNotificationHandlers(client, server) {
  const sdk = await loadSdk();
  try {
    client.setNotificationHandler(sdk.ToolListChangedNotificationSchema, async () => {
      broadcast('mcp:servers:tools_changed', { serverId: server.id });
    });
    client.setNotificationHandler(sdk.LoggingMessageNotificationSchema, async (notification) => {
      const params = notification.params || {};
      const message = typeof params.data === 'string' ? params.data : JSON.stringify(params.data);
      emitLog(server, {
        timestamp: Date.now(),
        level: params.level || 'info',
        message,
        source: params.logger || 'server',
      });
    });
  } catch (err) {
    console.warn(`[MCP] Failed to setup notification handlers for ${server.name}:`, err.message);
  }
}

async function getOrCreateClient(server) {
  if (!server || server.isActive === false) {
    throw new Error(`MCP server ${server?.name || server?.id} is disabled`);
  }

  const serverKey = getServerKey(server);

  const pending = pendingClients.get(serverKey);
  if (pending) {
    emitStatus(server.id, 'connecting');
    return pending;
  }

  const existing = clients.get(serverKey);
  if (existing) {
    try {
      const sdk = await loadSdk();
      await existing.client.ping({ timeout: 1000 });
      emitStatus(server.id, 'connected');
      return existing.client;
    } catch {
      clients.delete(serverKey);
    }
  }

  const initPromise = (async () => {
    try {
      emitStatus(server.id, 'connecting');
      emitLog(server, { timestamp: Date.now(), level: 'info', message: 'Connecting...', source: 'client' });

      const sdk = await loadSdk();
      const client = new sdk.Client(
        { name: 'DesktopFairy', version: app.getVersion() || '0.2.0' },
        { capabilities: {} },
      );
      const transport = await initTransport(server);

      await client.connect(transport, { timeout: MCP_CONNECT_TIMEOUT_MS });
      await setupNotificationHandlers(client, server);

      clients.set(serverKey, { client, server });
      emitStatus(server.id, 'connected');
      emitLog(server, { timestamp: Date.now(), level: 'info', message: 'Server connected', source: 'client' });
      return client;
    } catch (error) {
      emitStatus(server.id, 'error', error);
      emitLog(server, {
        timestamp: Date.now(),
        level: 'error',
        message: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
        source: 'client',
      });
      throw error;
    } finally {
      pendingClients.delete(serverKey);
    }
  })();

  pendingClients.set(serverKey, initPromise);
  return initPromise;
}

async function closeClient(serverKey) {
  const entry = clients.get(serverKey);
  if (!entry) return;
  clients.delete(serverKey);
  serverLogs.remove(serverKey);
  try {
    await entry.client.close();
  } catch (err) {
    console.warn('[MCP] Error closing client:', err.message);
  }
}

async function closeClientsForServerId(serverId) {
  const pendingKeys = Array.from(pendingClients.keys()).filter((key) => isServerKeyForId(key, serverId));
  await Promise.allSettled(pendingKeys.map((key) => pendingClients.get(key)?.catch(() => undefined)));

  const keys = Array.from(clients.keys()).filter((key) => isServerKeyForId(key, serverId));
  await Promise.allSettled(keys.map((key) => closeClient(key)));
}

async function callTool({ serverId, name, args, callId }) {
  const { getServerById } = getMcpServerService();
  const server = await getServerById(serverId);
  if (!server) throw new Error(`MCP server ${serverId} not found`);

  const client = await getOrCreateClient(server);
  const toolCallId = callId || crypto.randomUUID();
  const abortController = new AbortController();
  activeToolCalls.set(toolCallId, abortController);

  const timeout = server.timeout ? Math.max(1000, server.timeout * 1000) : DEFAULT_TOOL_TIMEOUT_MS;

  try {
    emitLog(server, { timestamp: Date.now(), level: 'info', message: `Calling tool: ${name}`, source: 'client' });
    const result = await client.callTool(
      { name, arguments: args || {} },
      undefined,
      {
        onprogress: (progress) => {
          const ratio = progress.total ? progress.progress / progress.total : 0;
          broadcast('mcp:tool:progress', { callId: toolCallId, progress: ratio });
        },
        timeout,
        signal: abortController.signal,
      },
    );
    emitLog(server, { timestamp: Date.now(), level: 'info', message: `Tool completed: ${name}`, source: 'client' });
    return result;
  } catch (error) {
    emitLog(server, {
      timestamp: Date.now(),
      level: 'error',
      message: `Tool failed: ${name} - ${error instanceof Error ? error.message : String(error)}`,
      source: 'client',
    });
    throw error;
  } finally {
    activeToolCalls.delete(toolCallId);
  }
}

function abortTool(callId) {
  const controller = activeToolCalls.get(callId);
  if (!controller) return false;
  controller.abort();
  activeToolCalls.delete(callId);
  return true;
}

async function checkConnectivity(serverId) {
  const { getServerById } = getMcpServerService();
  const server = await getServerById(serverId);
  if (!server) throw new Error(`MCP server ${serverId} not found`);

  try {
    const client = await getOrCreateClient(server);
    await client.listTools();
    emitStatus(server.id, 'connected');
    emitLog(server, { timestamp: Date.now(), level: 'info', message: 'Connectivity check passed', source: 'connectivity' });
    return true;
  } catch (error) {
    emitStatus(server.id, 'error', error);
    await closeClientsForServerId(server.id);
    return false;
  }
}

async function stopServer(serverId) {
  const { getServerById } = getMcpServerService();
  const server = await getServerById(serverId);
  if (!server) return;
  emitStatus(server.id, 'disabled');
  emitLog(server, { timestamp: Date.now(), level: 'info', message: 'Server stopped', source: 'client' });
  await closeClientsForServerId(server.id);
}

async function restartServer(serverId) {
  const { getServerById } = getMcpServerService();
  const server = await getServerById(serverId);
  if (!server) throw new Error(`MCP server ${serverId} not found`);
  await stopServer(serverId);
  await getOrCreateClient(server);
  await checkConnectivity(serverId);
}

async function removeServer(serverId) {
  await stopServer(serverId);
}

async function getServerLogs(serverId) {
  const { getServerById } = getMcpServerService();
  const server = await getServerById(serverId);
  if (!server) return [];
  return serverLogs.get(getServerKey(server));
}

async function getServerVersion(serverId) {
  const { getServerById } = getMcpServerService();
  const server = await getServerById(serverId);
  if (!server) return null;
  try {
    const client = await getOrCreateClient(server);
    return client.getServerVersion?.() || null;
  } catch {
    return null;
  }
}

function getStatus(serverId) {
  if (serverId) return statusMap.get(serverId) || { state: 'disabled' };
  return Object.fromEntries(statusMap.entries());
}

async function disposeAll() {
  await closeClientsForServerId(); // no id matches none; so we need close all
  const keys = Array.from(clients.keys());
  await Promise.allSettled(keys.map((key) => closeClient(key)));
  pendingClients.clear();
  activeToolCalls.clear();
  statusMap.clear();
  serverLogs.clear();
}

function registerMcpRuntimeHandlers(ipcMain) {
  ipcMain.handle('mcp:servers:restart', async (_event, { id }) => {
    if (!id) throw new Error('id required');
    await restartServer(String(id));
    return { ok: true };
  });

  ipcMain.handle('mcp:servers:stop', async (_event, { id }) => {
    if (!id) throw new Error('id required');
    await stopServer(String(id));
    return { ok: true };
  });

  ipcMain.handle('mcp:servers:status', async (_event, { id } = {}) => {
    return getStatus(id ? String(id) : undefined);
  });

  ipcMain.handle('mcp:servers:logs', async (_event, { id }) => {
    if (!id) throw new Error('id required');
    return getServerLogs(String(id));
  });

  ipcMain.handle('mcp:servers:abort_tool', async (_event, { callId }) => {
    if (!callId) throw new Error('callId required');
    return abortTool(String(callId));
  });
}

module.exports = {
  registerMcpRuntimeHandlers,
  getOrCreateClient,
  callTool,
  abortTool,
  checkConnectivity,
  stopServer,
  restartServer,
  removeServer,
  closeClientsForServerId,
  getServerLogs,
  getServerVersion,
  disposeAll,
  getStatus,
};
