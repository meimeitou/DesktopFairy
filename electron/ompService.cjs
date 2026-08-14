'use strict';

const { spawn } = require('child_process');
const { createInterface } = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');

/** @type {import('child_process').ChildProcess | null} */
let ompProcess = null;
/** @type {string | null} */
let currentCwd = null;
/** True while we are intentionally killing the process to suppress exit error. */
let isStopping = false;
/** Pending one-shot RPC callbacks keyed by request id. */
const pending = new Map();
let reqCounter = 0;

/** Broadcast an event to all live BrowserWindow webContents. */
function broadcast(channel, payload) {
  const { BrowserWindow } = require('electron');
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
  }
}

/** Write a JSON line to omp stdin. */
function sendRpc(obj) {
  if (!ompProcess || !ompProcess.stdin) return;
  ompProcess.stdin.write(JSON.stringify(obj) + '\n');
}

/** Send an RPC command and resolve/reject on the matching response. */
function sendRpcAndWait(obj, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const id = `req_${++reqCounter}`;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`omp RPC timeout: ${obj.type}`));
    }, timeoutMs);
    pending.set(id, (response) => {
      clearTimeout(timer);
      pending.delete(id);
      if (response.success === false) reject(new Error(response.error || 'omp RPC error'));
      else resolve(response.data ?? response);
    });
    sendRpc({ ...obj, id });
  });
}

/** Handle one parsed stdout frame from omp. */
function handleFrame(frame) {
  // Resolve pending one-shot requests
  if (frame.type === 'response' && frame.id && pending.has(frame.id)) {
    pending.get(frame.id)(frame);
    return;
  }

  switch (frame.type) {
    case 'ready':
      broadcast('omp:ready', {});
      break;

    case 'message_update': {
      const event = frame.assistantMessageEvent;
      if (event?.type === 'text_delta' && event.delta) {
        broadcast('omp:chunk', { delta: event.delta });
      } else if (event?.type === 'thinking_delta' && event.delta) {
        broadcast('omp:chunk', { thinking: event.delta });
      }
      break;
    }

    case 'message_end': {
      const msg = frame.message;
      if (msg?.role === 'assistant' && msg?.stopReason === 'error') {
        const errMsg = msg.errorMessage || 'Model request failed';
        const provider = msg.provider ? `${msg.provider}/` : '';
        const model = msg.model || '';
        broadcast('omp:chunk', { delta: `\n\n⚠ ${provider}${model}: ${errMsg}` });
      }
      // Broadcast token usage when available
      if (msg?.usage || msg?.contextSnapshot) {
        broadcast('omp:usage', {
          inputTokens:
            msg?.usage?.inputTokens ??
            msg?.usage?.input_tokens ??
            msg?.usage?.input ??
            msg?.contextSnapshot?.promptTokens ??
            null,
          outputTokens:
            msg?.usage?.outputTokens ??
            msg?.usage?.output_tokens ??
            msg?.usage?.output ??
            null,
          cacheReadTokens:
            msg?.usage?.cacheReadTokens ??
            msg?.usage?.cache_read_input_tokens ??
            msg?.usage?.cacheRead ??
            msg?.usage?.cache_read ??
            null,
          contextWindow:
            msg?.usage?.contextWindow ??
            msg?.usage?.context_window ??
            null,
        });
      }
      break;
    }

    case 'agent_end':
      broadcast('omp:done', { messages: frame.messages ?? [] });
      break;

    case 'tool_execution_start':
      broadcast('omp:tool', {
        phase: 'start',
        toolCallId: frame.toolCallId,
        toolName: frame.toolName,
        args: frame.args ?? null,
        intent: frame.intent ?? null,
      });
      break;

    case 'tool_execution_update': {
      // Streaming stdout/output from a running tool (e.g. bash live output)
      const updateText =
        frame.update?.content?.[0]?.text ??
        frame.update?.text ??
        null;
      if (updateText) {
        broadcast('omp:tool', {
          phase: 'update',
          toolCallId: frame.toolCallId,
          // Each update is a cumulative snapshot, not a delta — replace previous
          output: updateText,
        });
      }
      break;
    }

    case 'tool_execution_end': {
      const result = frame.result;
      const resultText = Array.isArray(result?.content)
        ? result.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
        : (typeof result === 'string' ? result : null);
      const diff = result?.details?.diff ?? frame.details?.diff ?? null;
      const filePath = result?.details?.path ?? frame.details?.path ?? null;
      broadcast('omp:tool', {
        phase: 'end',
        toolCallId: frame.toolCallId,
        output: resultText,
        isError: Boolean(frame.isError),
        diff,
        filePath,
      });
      break;
    }

    case 'session_name_updated':
      broadcast('omp:session_name', { name: frame.name });
      break;

    case 'model_changed':
      if (frame.model) broadcast('omp:model_changed', { model: frame.model });
      break;

    case 'auto_compaction_start':
      broadcast('omp:notice', { kind: 'compaction_start' });
      break;

    case 'auto_compaction_end':
      broadcast('omp:notice', { kind: 'compaction_end', summary: frame.summary ?? null });
      break;

    case 'notice':
      if (frame.message) broadcast('omp:notice', { kind: 'notice', text: frame.message });
      break;

    case 'session_info_update':
      // Carries session name when set via RPC or slash command
      if (frame.name) broadcast('omp:session_name', { name: frame.name });
      break;

    case 'command_output':
      if (frame.command_output) {
        // Strip ANSI escape sequences before forwarding to renderer
        const text = String(frame.command_output).replace(/\x1b\[[0-9;]*[mGKHFJA-Z]/g, '').trim();
        if (text) broadcast('omp:command_output', { text });
      }
      break;
  }
}

/** Start `omp --mode rpc` in the given working directory. */
function startOmp(cwd) {
  if (ompProcess && !ompProcess.killed) {
    stopOmp();
  }
  currentCwd = cwd || os.homedir();

  const proc = spawn('omp', ['--mode', 'rpc'], {
    cwd: currentCwd,
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  ompProcess = proc;

  const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity });
  rl.on('line', (line) => {
    if (!line.trim()) return;
    try {
      handleFrame(JSON.parse(line));
    } catch {
      // Ignore malformed frames
    }
  });

  proc.on('exit', (code) => {
    // Guard: only clear ompProcess if it still points to this process instance
    if (ompProcess === proc) ompProcess = null;
    if (!isStopping) {
      broadcast('omp:error', { message: `omp exited (code ${code})` });
    }
    isStopping = false;
  });

  proc.on('error', (err) => {
    if (ompProcess === proc) ompProcess = null;
    broadcast('omp:error', { message: err.message });
  });
}

function stopOmp() {
  if (ompProcess) {
    isStopping = true;
    ompProcess.kill();
    ompProcess = null;
  }
  pending.clear();
}

// ─── Session scanning ───────────────────────────────────────────────────────

const OMP_SESSIONS_DIR = path.join(os.homedir(), '.omp', 'agent', 'sessions');

/** Read the first meaningful header lines from a session JSONL file. */
async function parseSessionHeader(filePath) {
  return new Promise((resolve) => {
    let header = null;
    let name = null;
    let firstMessage = null;
    let lineCount = 0;

    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    rl.on('line', (line) => {
      if (!line.trim()) return;
      lineCount++;
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'session') header = entry;
        else if (entry.type === 'session_info' && entry.name) name = entry.name;
        else if (!firstMessage && entry.type === 'message' && entry.message?.role === 'user') {
          const content = entry.message.content;
          if (typeof content === 'string') firstMessage = content.slice(0, 100);
          else if (Array.isArray(content)) {
            const tb = content.find((b) => b.type === 'text');
            if (tb) firstMessage = tb.text?.slice(0, 100);
          }
        }
      } catch {
        // Skip unparseable lines
      }
      if (lineCount >= 60 && firstMessage) {
        rl.close();
        stream.destroy();
      }
    });

    rl.on('close', () => {
      if (!header?.id) { resolve(null); return; }
      resolve({
        id: header.id,
        filePath,
        timestamp: header.timestamp ?? null,
        cwd: header.cwd ?? null,
        name: name ?? header.title ?? null,
        firstMessage: firstMessage ?? null,
      });
    });

    rl.on('error', () => resolve(null));
    stream.on('error', () => resolve(null));
  });
}

/** Read all CoreMessages from a session JSONL file for history rendering. */
async function readSessionHistory(filePath) {
  return new Promise((resolve) => {
    const messages = [];
    // toolCallId → intent string, from custom tool_execution_start entries
    const toolIntents = {};
    // toolCallId → unified diff string, from toolResult details
    const toolDiffs = {};
    // toolCallId → file path, from toolResult details
    const toolPaths = {};
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    rl.on('line', (line) => {
      if (!line.trim()) return;
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'message' && entry.message?.role) {
          messages.push(entry.message);
          // collect diff from toolResult details
          if (entry.message.role === 'toolResult' && entry.message.details?.diff) {
            toolDiffs[entry.message.toolCallId] = entry.message.details.diff;
          }
          if (entry.message.role === 'toolResult' && entry.message.details?.path) {
            toolPaths[entry.message.toolCallId] = entry.message.details.path;
          }
        } else if (
          entry.type === 'custom' &&
          entry.customType === 'tool_execution_start' &&
          entry.data?.toolCallId &&
          entry.data?.intent
        ) {
          toolIntents[entry.data.toolCallId] = entry.data.intent;
        }
      } catch {
        // skip malformed lines
      }
    });

    rl.on('close', () => resolve({ messages, toolIntents, toolDiffs, toolPaths }));
    rl.on('error', () => resolve({ messages, toolIntents, toolDiffs, toolPaths }));
    stream.on('error', () => resolve({ messages, toolIntents, toolDiffs, toolPaths }));
  });
}

/** List all sessions across all cwds, sorted by timestamp desc. */
async function listSessions() {
  if (!fs.existsSync(OMP_SESSIONS_DIR)) return [];

  const dirs = fs.readdirSync(OMP_SESSIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  /** @type {Array<Promise<object|null>>} */
  const tasks = [];

  for (const dir of dirs) {
    const projectDir = path.join(OMP_SESSIONS_DIR, dir.name);
    let files;
    try {
      files = fs.readdirSync(projectDir).filter((f) => f.endsWith('.jsonl'));
    } catch {
      continue;
    }
    for (const file of files) {
      tasks.push(parseSessionHeader(path.join(projectDir, file)));
    }
  }

  const results = (await Promise.all(tasks)).filter(Boolean);

  results.sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tb - ta;
  });

  return results;
}

// ─── IPC registration ───────────────────────────────────────────────────────

function registerOmpHandlers(ipcMain) {
  ipcMain.handle('omp:start', (_event, { cwd } = {}) => {
    // Idempotent: only start if no live process exists
    if (!ompProcess || ompProcess.killed) {
      startOmp(cwd || os.homedir());
    }
  });

  ipcMain.handle('omp:stop', () => stopOmp());

  ipcMain.handle('omp:prompt', async (_event, { message, images } = {}) => {
    // Build multimodal content array when images are attached
    const rpcPayload =
      images && images.length > 0
        ? {
            type: 'prompt',
            content: [
              ...images.map((img) => ({
                type: 'image',
                source: { type: 'base64', media_type: img.mediaType, data: img.data },
              })),
              { type: 'text', text: String(message ?? '') },
            ],
          }
        : { type: 'prompt', message: String(message ?? '') };
    const result = await sendRpcAndWait(rpcPayload, 30000).catch(() => null);
    // Slash commands have agentInvoked: false; no agent_end will fire so we signal done here
    if (result?.agentInvoked === false) {
      broadcast('omp:done', { messages: [] });
    }
  });

  ipcMain.handle('omp:abort', () => {
    sendRpc({ type: 'abort' });
  });

  ipcMain.handle('omp:get_state', async () => {
    return sendRpcAndWait({ type: 'get_state' });
  });

  ipcMain.handle('omp:sessions:list', async () => {
    return listSessions();
  });

  ipcMain.handle('omp:new_session', async (_event, { cwd } = {}) => {
    const target = cwd || currentCwd || os.homedir();
    if (target !== currentCwd) {
      // Restart omp in the chosen directory; omp:ready fires when ready
      startOmp(target);
    } else {
      sendRpc({ type: 'new_session' });
      // Process is still running — broadcast ready so the renderer unblocks
      broadcast('omp:ready', {});
    }
  });

  ipcMain.handle('omp:pick_directory', async () => {
    const { dialog, BrowserWindow } = require('electron');
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win || undefined, {
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || !result.filePaths?.[0]) return { ok: false };
    return { ok: true, path: result.filePaths[0] };
  });

  ipcMain.handle('omp:switch_session', async (_event, { sessionPath } = {}) => {
    // Wait for ACK so get_messages isn't called before the switch completes
    return sendRpcAndWait({ type: 'switch_session', sessionPath }, 10000).catch(() => null);
  });

  // Read history directly from disk instead of via RPC (avoids 1 MiB frame limit).
  ipcMain.handle('omp:sessions:read_history', async (_event, { filePath } = {}) => {
    if (!filePath || typeof filePath !== 'string') return { messages: [] };
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(OMP_SESSIONS_DIR + path.sep)) return { messages: [] };
    return await readSessionHistory(resolved);
  });

  ipcMain.handle('omp:set_thinking_level', async (_event, { level } = {}) => {
    return sendRpcAndWait({ type: 'set_thinking_level', level: String(level ?? 'off') }, 5000).catch(() => null);
  });

  ipcMain.handle('omp:set_auto_compaction', async (_event, { enabled } = {}) => {
    return sendRpcAndWait({ type: 'set_auto_compaction', enabled: Boolean(enabled) }, 5000).catch(() => null);
  });

  ipcMain.handle('omp:compact', async () => {
    sendRpc({ type: 'compact' });
  });

  ipcMain.handle('omp:get_available_models', async () => {
    return sendRpcAndWait({ type: 'get_available_models' }, 8000).catch(() => null);
  });

  ipcMain.handle('omp:set_model', async (_event, { provider, modelId } = {}) => {
    return sendRpcAndWait({ type: 'set_model', provider, modelId }, 5000).catch(() => null);
  });

  // Write a single DesktopFairy provider into ~/.omp/agent/models.yml, replacing its section if present.
  ipcMain.handle('omp:write_provider_to_models', async (_event, { provider } = {}) => {
    const modelsPath = path.join(os.homedir(), '.omp', 'agent', 'models.yml');
    const apiMap = { openai: 'openai-completions', 'openai-response': 'openai-responses', ollama: 'openai-completions', anthropic: 'anthropic-messages' };
    const api = apiMap[provider.type] || 'openai-completions';
    let baseUrl = (provider.apiHost || '').replace(/\/$/, '');
    if (provider.type === 'ollama' && !baseUrl.endsWith('/v1')) baseUrl += '/v1';
    const safeName = (provider.id || 'custom').replace(/[^a-zA-Z0-9_-]/g, '-');

    // Build YAML entry (always 2-space indent under providers:)
    const lines = [];
    lines.push(`  ${safeName}:`);
    lines.push(`    baseUrl: "${baseUrl}"`);
    lines.push(`    api: ${api}`);
    if (provider.apiKey) lines.push(`    apiKey: "${String(provider.apiKey).replace(/"/g, '\\"')}"`);
    if (provider.models && provider.models.length > 0) {
      lines.push('    models:');
      for (const m of provider.models) lines.push(`      - id: "${m}"`);
    }
    const newEntry = lines.join('\n');

    try {
      fs.mkdirSync(path.dirname(modelsPath), { recursive: true });

      // Line-by-line: strip any existing block for this provider (handles any indent level)
      let inBlock = false;
      const kept = [];
      if (fs.existsSync(modelsPath)) {
        for (const line of fs.readFileSync(modelsPath, 'utf8').split('\n')) {
          if (/^[ \t]*providers:/.test(line) && kept.length === 0) { kept.push('providers:'); continue; }
          // A line like `  safeName:` or `safeName:` (top-level) starts the block to remove
          if (new RegExp(`^[ \t]*${safeName}:`).test(line)) { inBlock = true; continue; }
          // Any non-empty line at indent ≤ 2 ends the block (next sibling provider)
          if (inBlock && /^[ \t]{0,2}\S/.test(line)) inBlock = false;
          if (!inBlock) kept.push(line);
        }
      }

      // Ensure providers: header exists
      if (!kept.some(l => /^providers:/.test(l))) kept.unshift('providers:');

      // Append new entry after the providers: line, preserving everything else
      const provIdx = kept.findIndex(l => /^providers:/.test(l));
      kept.splice(provIdx + 1, 0, newEntry);

      fs.writeFileSync(modelsPath, kept.join('\n'), 'utf8');
      return { success: true, path: modelsPath, safeName };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('omp:get_version', async () => {
    const { execFile } = require('child_process');
    return new Promise((resolve) => {
      execFile('omp', ['--version'], { timeout: 3000 }, (err, stdout) => {
        if (err) { resolve(null); return; }
        resolve(stdout.trim().split('\n')[0] ?? null);
      });
    });
  });

  ipcMain.handle('omp:get_home_dir', () => os.homedir());

  ipcMain.handle('omp:open_in_app', async (_event, { app, dirPath }) => {
    const { shell } = require('electron');
    const target = String(dirPath ?? currentCwd ?? os.homedir());
    if (app === 'finder') {
      shell.openPath(target);
    } else if (app === 'vscode') {
      shell.openExternal(`vscode://file/${encodeURI(target)}`);
    } else if (app === 'cursor') {
      shell.openExternal(`cursor://file/${encodeURI(target)}`);
    }
  });

  ipcMain.handle('omp:list_auth_status', async () => {
    return sendRpcAndWait({ type: 'list_auth_status' }, 5000).catch(() => null);
  });

  ipcMain.handle('omp:set_api_key', async (_event, { provider, apiKey } = {}) => {
    return sendRpcAndWait({ type: 'set_api_key', provider, apiKey }, 5000).catch(() => null);
  });

  ipcMain.handle('omp:remove_api_key', async (_event, { provider } = {}) => {
    return sendRpcAndWait({ type: 'remove_api_key', provider }, 5000).catch(() => null);
  });

  ipcMain.handle('omp:get_agent_config', async () => {
    const configPath = path.join(os.homedir(), '.omp', 'agent', 'config.yml');
    try {
      const content = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
      return { success: true, content, path: configPath };
    } catch (e) {
      return { success: false, error: String(e), path: configPath };
    }
  });

  ipcMain.handle('omp:save_agent_config', async (_event, { content } = {}) => {
    const configPath = path.join(os.homedir(), '.omp', 'agent', 'config.yml');
    try {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, content, 'utf8');
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('omp:list_extensions', async () => {
    const extDirs = [
      path.join(os.homedir(), '.omp', 'agent', 'extensions'),
      path.join(process.cwd(), '.omp', 'extensions'),
    ];
    const results = [];
    for (const dir of extDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          const pkgPath = path.join(dir, e.name, 'package.json');
          let meta = { name: e.name, description: '' };
          if (fs.existsSync(pkgPath)) {
            try { const p = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); meta = { name: p.name ?? e.name, description: p.description ?? '' }; } catch {}
          }
          results.push({ ...meta, dir: path.join(dir, e.name) });
        }
      } catch {}
    }
    return results;
  });

  ipcMain.handle('omp:sessions:delete', async (_event, { filePath } = {}) => {
    if (!filePath || typeof filePath !== 'string') throw new Error('filePath required');
    const resolved = require('path').resolve(filePath);
    // Restrict deletion to the omp sessions directory
    if (!resolved.startsWith(OMP_SESSIONS_DIR + require('path').sep)) {
      throw new Error('Path outside omp sessions directory');
    }
    await require('fs').promises.unlink(resolved);
  });

  ipcMain.handle('omp:get_models_config', async () => {
    const configPath = path.join(os.homedir(), '.omp', 'agent', 'models.yml');
    try {
      const content = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
      return { success: true, content, path: configPath };
    } catch (e) {
      return { success: false, error: String(e), path: configPath };
    }
  });

  ipcMain.handle('omp:save_models_config', async (_event, { content } = {}) => {
    const configPath = path.join(os.homedir(), '.omp', 'agent', 'models.yml');
    try {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, content, 'utf8');
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('omp:list_skills', async () => {
    return sendRpcAndWait({ type: 'list_skill_inventory' }, 5000).catch(() => null);
  });

  ipcMain.handle('omp:set_skill_enabled', async (_event, { name, enabled } = {}) => {
    return sendRpcAndWait({ type: 'set_skill_enabled', name, enabled }, 5000).catch(() => null);
  });

  ipcMain.handle('omp:extension_install', async (_event, { name } = {}) => {
    if (!name || typeof name !== 'string') return { success: false, error: 'name required' };
    const { execFile } = require('child_process');
    return new Promise((resolve) => {
      execFile('omp', ['extension', 'install', name], { timeout: 30000 }, (err, stdout, stderr) => {
        if (err) { resolve({ success: false, error: (stderr || '').trim() || String(err) }); return; }
        resolve({ success: true, output: (stdout || '').trim() });
      });
    });
  });

  ipcMain.handle('omp:extension_uninstall', async (_event, { name } = {}) => {
    if (!name || typeof name !== 'string') return { success: false, error: 'name required' };
    const { execFile } = require('child_process');
    return new Promise((resolve) => {
      execFile('omp', ['extension', 'uninstall', name], { timeout: 10000 }, (err, stdout, stderr) => {
        if (err) { resolve({ success: false, error: (stderr || '').trim() || String(err) }); return; }
        resolve({ success: true, output: (stdout || '').trim() });
      });
    });
  });

  ipcMain.handle('omp:list_files', async (_event, { dir } = {}) => {
    if (!dir || typeof dir !== 'string') return [];
    const resolved = path.resolve(dir);
    try {
      const entries = fs.readdirSync(resolved, { withFileTypes: true });
      return entries
        .filter((e) => !e.name.startsWith('.'))
        .map((e) => ({ name: e.name, isDir: e.isDirectory() }))
        .sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
    } catch {
      return [];
    }
  });
}

module.exports = { registerOmpHandlers, stopOmp };
