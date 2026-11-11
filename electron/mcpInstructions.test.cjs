const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness({ instructions, connectionError, isActive = true } = {}) {
  const handlers = {};
  const server = { id: 'knowledge', name: 'knowledge', type: 'streamableHttp', baseUrl: 'http://localhost/mcp', isActive };
  let reads = 0;
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'mcpServerService.cjs'), 'utf8'), {
    module,
    require: (name) => {
      if (name === 'electron') return { app: { getPath: () => '/tmp/mcp-instructions-test' }, dialog: {} };
      if (name === 'fs') return {
        existsSync: () => true,
        readFileSync: () => JSON.stringify({ servers: [server], toolDefaultsRev: 3 }),
      };
      if (name === './mcpRuntimeService.cjs') return {
        getOrCreateClient: async () => {
          if (connectionError) throw new Error(connectionError);
          return { getInstructions: () => { reads++; return instructions; } };
        },
      };
      return require(name);
    },
  });
  module.exports.registerMcpServerHandlers({ handle: (name, fn) => { handlers[name] = fn; } });
  return { handlers, reads: () => reads };
}

describe('MCP server instructions IPC', () => {
  it('reads the initialize instructions verbatim through the live SDK client', async () => {
    const instructions = '# 使用说明\n先检索，再回答。\n<untrusted>保持原文</untrusted>';
    const h = harness({ instructions });
    expect(h.handlers['mcp:servers:instructions']).toBeTypeOf('function');
    expect(await h.handlers['mcp:servers:instructions']({}, { id: 'knowledge' })).toBe(instructions);
    expect(h.reads()).toBe(1);
  });
  it('returns empty text when the server omits instructions', async () => {
    const h = harness();
    expect(await h.handlers['mcp:servers:instructions']({}, { id: 'knowledge' })).toBe('');
  });
  it('preserves connection failures rather than reporting an empty instruction', async () => {
    const h = harness({ connectionError: 'connection refused' });
    await expect(h.handlers['mcp:servers:instructions']({}, { id: 'knowledge' })).rejects.toThrow('connection refused');
  });
  it('rejects missing and disabled servers', async () => {
    const h = harness({ isActive: false });
    await expect(h.handlers['mcp:servers:instructions']({}, { id: 'knowledge' })).rejects.toThrow('未启用');
    await expect(h.handlers['mcp:servers:instructions']({}, { id: 'missing' })).rejects.toThrow('not found');
    expect(h.reads()).toBe(0);
  });
  it('allows the renderer to invoke the instructions channel', () => {
    expect(fs.readFileSync(path.join(__dirname, 'preload.cjs'), 'utf8')).toContain("'mcp:servers:instructions'");
  });
});
