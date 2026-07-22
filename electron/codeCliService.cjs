const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const CLI_CONFIG_FILE_SPECS = {
  'claude-settings': '~/.claude/settings.json',
  'codex-config': '~/.codex/config.toml',
  'codex-auth': '~/.codex/auth.json',
  'opencode-config': '~/.config/opencode/opencode.json',
};

const CLI_CONFIG_TARGETS = {
  'claude-code': ['claude-settings'],
  'openai-codex': ['codex-config', 'codex-auth'],
  opencode: ['opencode-config'],
};

const CLI_BINARY_NAMES = {
  'claude-code': 'claude',
  'openai-codex': 'codex',
  opencode: 'opencode',
};

const CLI_NPM_PACKAGES = {
  'claude-code': '@anthropic-ai/claude-code',
  'openai-codex': '@openai/codex',
  opencode: 'opencode-ai',
};

const CLI_CONFIG_FILE_MODE = 0o600;

function resolveTargetPath(target) {
  const specPath = CLI_CONFIG_FILE_SPECS[target];
  if (!specPath) throw new Error(`Unknown config target: ${target}`);
  return path.join(os.homedir(), specPath.replace(/^~[/\\]/, ''));
}

async function readOrNull(absPath) {
  try {
    return await fs.promises.readFile(absPath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function atomicWriteFile(absPath, content) {
  const dir = path.dirname(absPath);
  await fs.promises.mkdir(dir, { recursive: true });
  const tmp = `${absPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tmp, content, { mode: CLI_CONFIG_FILE_MODE });
  await fs.promises.rename(tmp, absPath);
  try {
    await fs.promises.chmod(absPath, CLI_CONFIG_FILE_MODE);
  } catch {
    /* ignore chmod errors on some FS */
  }
}

async function writeCliConfigFiles(cliTool, files) {
  const allowed = new Set(CLI_CONFIG_TARGETS[cliTool] || []);
  const seen = new Set();
  for (const file of files) {
    if (!allowed.has(file.target)) {
      throw new Error(`${file.target} is not a config file of ${cliTool}`);
    }
    if (seen.has(file.target)) throw new Error(`Duplicate config target: ${file.target}`);
    seen.add(file.target);
  }

  const snapshots = [];
  try {
    for (const file of files) {
      const absPath = resolveTargetPath(file.target);
      const previousContent = await readOrNull(absPath);
      snapshots.push({
        absPath,
        existed: previousContent !== null,
        previousContent: previousContent ?? '',
      });
      await atomicWriteFile(absPath, file.content);
    }
  } catch (error) {
    for (const snapshot of snapshots.slice().reverse()) {
      try {
        if (snapshot.existed) {
          await atomicWriteFile(snapshot.absPath, snapshot.previousContent);
        } else {
          await fs.promises.unlink(snapshot.absPath);
        }
      } catch (rollbackErr) {
        console.error('[codeCli] rollback failed:', snapshot.absPath, rollbackErr);
      }
    }
    throw error;
  }
}

async function checkBinary(cliTool) {
  const bin = CLI_BINARY_NAMES[cliTool];
  if (!bin) return { installed: false };
  try {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const { stdout } = await execFileAsync(whichCmd, [bin], { timeout: 3000 });
    const binPath = String(stdout).trim().split(/\r?\n/)[0];
    if (!binPath) return { installed: false };
    try {
      const { stdout: verOut } = await execFileAsync(bin, ['--version'], { timeout: 5000 });
      return { installed: true, path: binPath, version: String(verOut).trim().split(/\r?\n/)[0] };
    } catch {
      return { installed: true, path: binPath };
    }
  } catch {
    return { installed: false };
  }
}

function buildLaunchCommand(cliTool, model) {
  const quote = (value) => {
    if (/^[a-zA-Z0-9._/@:-]+$/.test(value)) return value;
    return `'${String(value).replace(/'/g, "'\\''")}'`;
  };
  // exec replaces the shell so Ctrl+C / CLI exit also exits the PTY (tab can auto-close).
  if (cliTool === 'claude-code') {
    return model ? `exec claude --model ${quote(model)}` : 'exec claude';
  }
  if (cliTool === 'openai-codex') {
    return model ? `exec codex --model ${quote(model)}` : 'exec codex';
  }
  if (cliTool === 'opencode') return 'exec opencode';
  return '';
}

// POSIX single-quote for paths/args. Safe against shell metacharacters, $(), `` ` ``, etc.
function posixQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

// Double-quote an env value, escaping characters that are special inside double quotes
// (`\`, `"`, `$`, `` ` ``). Newlines/tabs are turned into escape sequences so the
// resulting `export K="..."` line stays on a single shell statement.
function escapeEnvValue(value) {
  const s = String(value ?? '');
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

// Build the full shell command: `cd '<cwd>' && clear && export K1="V1" && ... && <bin> [--model m]`
// envVars: user-supplied KEY/VALUE pairs (already validated for non-empty keys)
// providerEnv: provider-derived env (e.g. ANTHROPIC_BASE_URL) merged on top of envVars
function buildFullLaunchCommand(cliTool, model, cwd, envVars, providerEnv) {
  const parts = [];
  if (cwd) parts.push(`cd ${posixQuote(cwd)}`);
  parts.push('clear');
  const mergedEnv = { ...(envVars || {}), ...(providerEnv || {}) };
  for (const [k, v] of Object.entries(mergedEnv)) {
    if (!k || k.trim() === '') continue;
    parts.push(`export ${k}="${escapeEnvValue(v)}"`);
  }
  parts.push(buildLaunchCommand(cliTool, model));
  return parts.join(' && ');
}

function resolveNpmBinary() {
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'where' : 'which';
  try {
    // Synchronous resolve via spawnSync to keep handler simple.
    const { spawnSync } = require('child_process');
    const r = spawnSync(cmd, ['npm'], { encoding: 'utf8', timeout: 3000 });
    if (r.status === 0 && r.stdout) {
      const p = r.stdout.trim().split(/\r?\n/)[0];
      if (p) return p;
    }
  } catch {
    /* fall through */
  }
  return null;
}

async function installCliPackage(cliTool) {
  const pkg = CLI_NPM_PACKAGES[cliTool];
  if (!pkg) throw new Error(`Unsupported CLI tool: ${cliTool}`);
  const npmBin = resolveNpmBinary();
  const npmCmd = npmBin || 'npm';
  return new Promise((resolve, reject) => {
    const child = execFile(
      npmCmd,
      ['install', '-g', pkg],
      { timeout: 300000, maxBuffer: 4 * 1024 * 1024, env: process.env },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error(`${npmCmd} install -g ${pkg} failed: ${stderr || err.message}`));
        } else {
          resolve({ stdout: String(stdout), stderr: String(stderr) });
        }
      },
    );
    child.on('error', (err) => {
      reject(new Error(`无法启动 npm: ${err.message}`));
    });
  });
}

function registerCodeCliHandlers({ ipcMain }) {
  ipcMain.handle('code_cli:write_config', async (_event, { cliTool, files }) => {
    if (!CLI_CONFIG_TARGETS[cliTool]) {
      return { ok: false, error: `Unsupported CLI tool: ${cliTool}` };
    }
    if (!Array.isArray(files) || files.length === 0) {
      return { ok: false, error: 'No config files provided' };
    }
    try {
      await writeCliConfigFiles(cliTool, files);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('code_cli:check_binary', async (_event, { cliTool }) => {
    if (!CLI_BINARY_NAMES[cliTool]) {
      return { ok: false, error: `Unsupported CLI tool: ${cliTool}` };
    }
    const status = await checkBinary(cliTool);
    return { ok: true, ...status };
  });

  ipcMain.handle('code_cli:build_command', async (_event, { cliTool, model }) => {
    if (!CLI_BINARY_NAMES[cliTool]) {
      return { ok: false, error: `Unsupported CLI tool: ${cliTool}` };
    }
    return { ok: true, command: buildLaunchCommand(cliTool, model) };
  });

  ipcMain.handle('code_cli:read_config_files', async (_event, { cliTool }) => {
    const targets = CLI_CONFIG_TARGETS[cliTool];
    if (!targets) return { ok: false, error: `Unsupported CLI tool: ${cliTool}` };
    const files = {};
    for (const target of targets) {
      const absPath = resolveTargetPath(target);
      const content = await readOrNull(absPath);
      if (content !== null) files[target] = content;
    }
    return { ok: true, files };
  });

  ipcMain.handle('code_cli:install', async (_event, { cliTool }) => {
    if (!CLI_NPM_PACKAGES[cliTool]) {
      return { ok: false, error: `Unsupported CLI tool: ${cliTool}` };
    }
    try {
      await installCliPackage(cliTool);
      const status = await checkBinary(cliTool);
      return { ok: true, installed: status.installed, version: status.version, path: status.path };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('code_cli:build_launch_command', async (_event, payload) => {
    const { cliTool, model, cwd, envVars, providerEnv } = payload || {};
    if (!CLI_BINARY_NAMES[cliTool]) {
      return { ok: false, error: `Unsupported CLI tool: ${cliTool}` };
    }
    try {
      const command = buildFullLaunchCommand(cliTool, model, cwd, envVars, providerEnv);
      return { ok: true, command };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });
}

module.exports = {
  registerCodeCliHandlers,
  checkBinary,
  buildLaunchCommand,
  buildFullLaunchCommand,
};
