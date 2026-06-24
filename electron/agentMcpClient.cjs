const { spawn } = require('child_process');

let requestIdCounter = 0;

function nextJsonRpcId() {
  requestIdCounter += 1;
  return requestIdCounter;
}

class McpSession {
  constructor(serverConfig) {
    this.serverConfig = serverConfig;
    this.proc = null;
    this.buffer = '';
    this.pending = new Map();
    this.tools = [];
  }

  start() {
    if (this.proc) return;
    const cmd = this.serverConfig.command;
    const args = this.serverConfig.args || [];
    if (!cmd) throw new Error(`MCP server ${this.serverConfig.name} has no command`);

    this.proc = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...(this.serverConfig.env || {}) },
    });

    this.proc.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString();
      this.flushBuffer();
    });

    this.proc.stderr.on('data', (chunk) => {
      const text = chunk.toString().trim();
      if (text) console.warn(`[MCP:${this.serverConfig.name}]`, text.slice(0, 500));
    });

    this.proc.on('exit', () => {
      this.rejectAllPending(new Error('MCP process exited'));
      this.proc = null;
    });
  }

  flushBuffer() {
    while (true) {
      const nl = this.buffer.indexOf('\n');
      if (nl === -1) break;
      const line = this.buffer.slice(0, nl).trim();
      this.buffer = this.buffer.slice(nl + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id != null && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message || 'MCP error'));
          else resolve(msg.result);
        }
      } catch {
        /* ignore */
      }
    }
  }

  rejectAllPending(err) {
    for (const [, entry] of this.pending.entries()) {
      entry.reject(err);
    }
    this.pending.clear();
  }

  notify(method, params = {}) {
    if (!this.proc || !this.proc.stdin.writable) return;
    const payload = JSON.stringify({ jsonrpc: '2.0', method, params });
    this.proc.stdin.write(`${payload}\n`);
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.proc || !this.proc.stdin.writable) {
        reject(new Error('MCP process not running'));
        return;
      }
      const id = nextJsonRpcId();
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`MCP timeout: ${method}`));
        }
      }, 20_000);
      this.pending.set(id, {
        resolve: (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
      const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params });
      this.proc.stdin.write(`${payload}\n`);
    });
  }

  async initialize() {
    this.start();
    await this.send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'DesktopFairy', version: '0.2.0' },
    });
    this.notify('notifications/initialized', {});
  }

  async listTools() {
    const result = await this.send('tools/list', {});
    const tools = Array.isArray(result?.tools) ? result.tools : [];
    this.tools = tools.map((tool) => ({
      ...tool,
      openAiName: `mcp__${this.serverConfig.id}__${tool.name}`,
    }));
    return this.tools;
  }

  async callTool(name, args) {
    const result = await this.send('tools/call', { name, arguments: args || {} });
    const textParts = [];
    if (Array.isArray(result?.content)) {
      for (const part of result.content) {
        if (part?.type === 'text' && part.text) textParts.push(part.text);
      }
    }
    return JSON.stringify({
      ok: true,
      content: textParts.join('\n') || result,
    });
  }

  dispose() {
    this.rejectAllPending(new Error('MCP session disposed'));
    if (this.proc) {
      try {
        this.proc.kill();
      } catch {
        /* ignore */
      }
      this.proc = null;
    }
    this.pending.clear();
  }
}

async function loadMcpToolDefinitions(servers) {
  const enabled = (servers || []).filter((s) => s && s.isActive !== false && s.command);
  const definitions = [];
  const executors = new Map();
  const sessions = [];

  for (const server of enabled) {
    const session = new McpSession(server);
    sessions.push(session);
    try {
      await session.initialize();
      const tools = await session.listTools();
      for (const tool of tools) {
        definitions.push({
          type: 'function',
          function: {
            name: tool.openAiName,
            description: `[MCP:${server.name}] ${tool.description || tool.name}`,
            parameters: tool.inputSchema || { type: 'object', properties: {} },
          },
        });
        executors.set(tool.openAiName, async (args) => session.callTool(tool.name, args));
      }
    } catch (err) {
      console.warn(`MCP server ${server.name} failed:`, err.message);
      session.dispose();
    }
  }

  return {
    definitions,
    executeMcpTool: async (openAiName, args) => {
      const fn = executors.get(openAiName);
      if (!fn) return JSON.stringify({ ok: false, error: 'MCP tool not found' });
      return fn(args);
    },
    dispose: () => {
      for (const session of sessions) session.dispose();
    },
  };
}

module.exports = { loadMcpToolDefinitions, McpSession };
