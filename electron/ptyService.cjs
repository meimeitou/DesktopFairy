const pty = require('node-pty');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const sessions = new Map();

// VS Code shell integration protocol (OSC 633).
// These escape sequences are natively consumed by xterm.js and are invisible
// to the user. Shell integration hooks (preexec/precmd) emit them around
// every command, so no wrapper commands are needed.
//
//   OSC 633 ; C ST              → command start (preexec)
//   OSC 633 ; D ; <exit> ST     → command finished (precmd)
//
// ST = BEL (\x07).
const START_PATTERN = /\x1b\]633;C\x07/;
const END_PATTERN = /\x1b\]633;D;(-?\d+)\x07/;

// ─── Output pipeline middlewares ───
// Inspired by tabby's SessionMiddlewareStack but simplified to a synchronous
// unidirectional chain (PTY output → renderer). Each middleware is a factory
// returning (chunk: Buffer, session?) => Buffer. Stateful middlewares (UTF-8
// boundary) keep state in closure. OSC 633 capture state machine is NOT a
// middleware — it controls whether output flows to the renderer, so it stays
// in flushBatch.

// UTF-8 boundary fixup. node-pty may split a multi-byte character across
// onData calls; without this the join('') would produce U+FFFD for CJK/emoji.
function createUtf8BoundaryMiddleware() {
  let pending = Buffer.alloc(0);
  return (chunk) => {
    const combined = Buffer.concat([pending, chunk]);
    let cutAt = combined.length;
    while (cutAt > 0) {
      const byte = combined[cutAt - 1];
      if (byte < 0x80) break;             // ASCII, complete
      if (byte >= 0xC0) {                  // leading byte, check completeness
        const need = byte >= 0xF0 ? 4 : byte >= 0xE0 ? 3 : 2;
        if (combined.length - (cutAt - 1) < need) {
          cutAt -= 1;                      // incomplete, retain
        }
        break;
      }
      cutAt -= 1;                          // continuation byte, keep scanning
    }
    const complete = combined.slice(0, cutAt);
    pending = combined.slice(cutAt);
    return complete;
  };
}

// Strip residual OSC 633 markers so they never reach xterm (avoids visible
// noise in fallback scenarios where a manual printf emits duplicate end markers).
const OSC_633_STRIP_PATTERN = /\x1b\]633;[^\x07\x1b]*(?:\x07|\x1b\\)/g;
function createOsc633StripMiddleware() {
  return (chunk) => Buffer.from(chunk.toString('utf8').replace(OSC_633_STRIP_PATTERN, ''), 'utf8');
}

// OSC 7: file://<host><path> — macOS Terminal.app / iTerm2 standard for CWD.
const OSC7_CWD_PATTERN = /\x1b\]7;file:\/\/[^\/]*([^\x07\x1b]*)\x07/g;
function createOsc7CwdMiddleware() {
  return (chunk, session) => Buffer.from(chunk.toString('utf8').replace(OSC7_CWD_PATTERN, (_, p) => {
    try { session.cwd = decodeURIComponent(p); } catch { /* ignore malformed */ }
    return '';
  }), 'utf8');
}

// OSC 1337: CurrentDir=<path> — iTerm2 extension.
const OSC1337_CWD_PATTERN = /\x1b\]1337;CurrentDir=([^\x07\x1b]*)\x07/g;
function createOsc1337CwdMiddleware() {
  return (chunk, session) => Buffer.from(chunk.toString('utf8').replace(OSC1337_CWD_PATTERN, (_, p) => {
    session.cwd = p;
    return '';
  }), 'utf8');
}

function createSessionPipeline() {
  const utf8Boundary = createUtf8BoundaryMiddleware();
  const filters = [
    createOsc633StripMiddleware(),
    createOsc7CwdMiddleware(),
    createOsc1337CwdMiddleware(),
  ];
  return {
    // Apply UTF-8 boundary fixup first — returns complete characters only.
    fixUtf8(chunk) { return utf8Boundary(chunk); },
    // Then run OSC strip + CWD extraction filters.
    filter(chunk, session) {
      let data = chunk;
      for (const mw of filters) {
        data = mw(data, session);
        if (data.length === 0) return data;
      }
      return data;
    },
  };
}

// Foreground-process detection. The PTY spawns a shell (ptyProcess.pid); we use
// `ps -o tpgid=,pgid= -p <pid>` to read the controlling terminal's foreground
// process group (tpgid) vs the shell's own process group (pgid). When they
// match, the shell is at its prompt. When they differ, a child process is in
// the foreground — we then read that child's comm to classify it:
//   - ssh/mosh             → remote session (allow + annotate)
//   - known shells         → sub-shell / non-ssh remote shell (allow)
//   - anything else        → vim/less/python/... (block to avoid blind-typing)
// execFile (async) with array args avoids shell injection. On any ps failure we
// fall back to 'unknown' (treated as unsafe) so we never blind-type into vim/less.
const REMOTE_COMM_RE = /^(ssh|mosh|mosh-client)$/;
const SHELL_COMMS = new Set([
  'bash', 'zsh', 'sh', 'fish', 'dash', 'ksh', 'csh', 'tcsh', 'mksh',
  'ash', 'busybox', 'nu', 'nushell', 'elvish', 'xonsh', 'pwsh', 'powershell',
]);
// Programs that own the terminal but where injecting commands is intentional
// (user opted in). expect runs Tcl; allow by explicit user preference.
const ALLOWED_NON_SHELL_COMMS = new Set(['expect', 'expectk']);

function psFieldAsync(pid, field) {
  return new Promise((resolve) => {
    execFile('ps', ['-o', `${field}=`, '-p', String(pid)], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }, (err, stdout) => {
      if (err) return resolve('');
      resolve(String(stdout || '').trim());
    });
  });
}

async function detectForeground(session) {
  const pid = session?.ptyProcess?.pid;
  if (!pid) return { kind: 'shell' };
  // Read tpgid and pgid as separate ps invocations — on macOS the combined
  // `tpgid=,pgid=` form leaks a "TPGID" header line into the output, while
  // single-field requests return a clean value.
  const tpgidRaw = await psFieldAsync(pid, 'tpgid');
  const pgidRaw = await psFieldAsync(pid, 'pgid');
  const tpgid = parseInt(tpgidRaw, 10);
  const pgid = parseInt(pgidRaw, 10);
  // NaN (ps failed) or tpgid 0 (no controlling tty, e.g. a non-interactive
  // shell). ps 失败时回退为 'unknown'（不安全），避免盲写到 vim/less。
  if (!Number.isFinite(tpgid) || !Number.isFinite(pgid)) return { kind: 'unknown' };
  if (tpgid === 0 || tpgid === pgid) return { kind: 'shell' };
  // A child process is foreground. The foreground-pg leader has pid === tpgid.
  const comm = await psFieldAsync(tpgid, 'comm');
  if (!comm) return { kind: 'blocked', comm: '' };
  const base = comm.split('/').pop();
  if (REMOTE_COMM_RE.test(base)) {
    const remoteHost = await parseRemoteHost(tpgid);
    return { kind: 'remote', comm: base, remoteHost };
  }
  if (SHELL_COMMS.has(base)) return { kind: 'shell', comm: base };
  if (ALLOWED_NON_SHELL_COMMS.has(base)) return { kind: 'shell', comm: base };
  return { kind: 'blocked', comm: base };
}

// Best-effort user@host extraction from the ssh/mosh argv tail.
async function parseRemoteHost(pid) {
  const args = await psFieldAsync(pid, 'args');
  if (!args) return '';
  const tokens = args.split(/\s+/).filter(Boolean);
  // Drop the program name and option flags; the last non-flag token is usually user@host.
  let host = '';
  for (let i = tokens.length - 1; i >= 1; i--) {
    const t = tokens[i];
    if (!t.startsWith('-')) { host = t; break; }
  }
  return host;
}

async function getTerminalForeground(sessionId) {
  const session = sessionId ? sessions.get(sessionId) : null;
  if (!session) return null;
  try {
    const fg = await detectForeground(session);
    return { ...fg, cwd: session.cwd || null };
  } catch {
    return { kind: 'unknown', cwd: session.cwd || null };
  }
}

function shellQuote(str) {
  return "'" + String(str).replace(/'/g, "'\\''") + "'";
}

function stripAnsi(str) {
  if (!str) return str;
  return str
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
    .replace(/\x1B\][^\x07\x1b]*(?:\x07|\x1B\\)/g, '');
}

function buildEnv() {
  const env = {};
  const keepKeys = [
    'HOME', 'USER', 'LOGNAME', 'LANG', 'TERM', 'TERM_PROGRAM',
    'TERM_PROGRAM_VERSION', 'COLORTERM', 'COLORFGBG', 'ITERM_SESSION_ID',
    'SSH_AUTH_SOCK', 'DISPLAY', 'EDITOR', 'VISUAL', 'PAGER', 'LESS',
    'LSCOLORS', 'CLICOLOR', 'NODE_REPL_HISTORY',
    // History — zsh/bash read these to locate the history file. Preserving
    // them helps when the parent process (e.g. a shell that launched
    // DesktopFairy from CLI) already has them set.
    'HISTFILE', 'HISTSIZE', 'SAVEHIST',
  ];
  for (const key of keepKeys) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  env.PATH = process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';
  if (process.env.SHELL) env.SHELL = process.env.SHELL;
  if (process.env.XDG_CONFIG_HOME) env.XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME;
  if (process.env.HOMEBREW_PREFIX) env.HOMEBREW_PREFIX = process.env.HOMEBREW_PREFIX;
  return env;
}

// Create a temporary shell integration script that sets up preexec/precmd
// hooks to emit OSC 633 sequences. This mirrors VS Code's approach:
// the shell itself emits the markers around every command, so the agent
// only needs to write `command\n` — no printf/stty/subshell wrapper.
function setupShellIntegration(shell) {
  try {
    if (!shell || shell.includes('zsh')) {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'df-zsh-'));
      const userZdotdir = process.env.ZDOTDIR || '';

      // .zshenv — zsh reads $ZDOTDIR/.zshenv FIRST, before any other rc file.
      // We set ZDOTDIR=tmpDir at spawn time so zsh finds this file. Here we
      // temporarily switch ZDOTDIR back to the user's, source their .zshenv
      // (which often sets HISTFILE/HISTSIZE/SAVEHIST and other env vars), then
      // restore ZDOTDIR to tmpDir so zsh still finds our .zshrc next.
      // Without this, the user's .zshenv is silently skipped and shell history
      // is lost (Up arrow shows nothing).
      const zshenv = [
        '# DesktopFairy shell integration (auto-generated .zshenv)',
        '__df_tmp_zdotdir="$ZDOTDIR"',
        userZdotdir ? `ZDOTDIR=${shellQuote(userZdotdir)}` : 'unset ZDOTDIR',
        'if [[ -f "$ZDOTDIR/.zshenv" ]]; then',
        '  source "$ZDOTDIR/.zshenv"',
        'elif [[ -z "$ZDOTDIR" && -f "$HOME/.zshenv" ]]; then',
        '  source "$HOME/.zshenv"',
        'fi',
        'ZDOTDIR="$__df_tmp_zdotdir"',
        'unset __df_tmp_zdotdir',
        '',
      ].join('\n');
      fs.writeFileSync(path.join(tmpDir, '.zshenv'), zshenv);

      // .zprofile — login shells (-l) read $ZDOTDIR/.zprofile after .zshenv
      // but before .zshrc. Same pattern: source user's .zprofile then restore.
      const zprofile = [
        '# DesktopFairy shell integration (auto-generated .zprofile)',
        '__df_tmp_zdotdir="$ZDOTDIR"',
        userZdotdir ? `ZDOTDIR=${shellQuote(userZdotdir)}` : 'unset ZDOTDIR',
        'if [[ -f "$ZDOTDIR/.zprofile" ]]; then',
        '  source "$ZDOTDIR/.zprofile"',
        'elif [[ -z "$ZDOTDIR" && -f "$HOME/.zprofile" ]]; then',
        '  source "$HOME/.zprofile"',
        'fi',
        'ZDOTDIR="$__df_tmp_zdotdir"',
        'unset __df_tmp_zdotdir',
        '',
      ].join('\n');
      fs.writeFileSync(path.join(tmpDir, '.zprofile'), zprofile);

      // .zshrc — restore ZDOTDIR, source user's .zshrc, then register hooks.
      const zshrc = [
        '# DesktopFairy shell integration (auto-generated)',
        userZdotdir ? `ZDOTDIR=${shellQuote(userZdotdir)}` : 'unset ZDOTDIR',
        '# /etc/zshrc runs BEFORE this file, while ZDOTDIR still pointed to our',
        '# temp dir. On macOS /etc/zshrc sets HISTFILE=${ZDOTDIR:-$HOME}/.zsh_history,',
        '# so HISTFILE now wrongly points into the temp dir. Re-evaluate with the',
        '# restored ZDOTDIR so zsh loads the user\'s real history file.',
        'if [[ -n "$HISTFILE" ]]; then',
        '  HISTFILE=${ZDOTDIR:-$HOME}/.zsh_history',
        'fi',
        'if [[ -f "$ZDOTDIR/.zshrc" ]]; then',
        '  source "$ZDOTDIR/.zshrc"',
        'elif [[ -z "$ZDOTDIR" && -f "$HOME/.zshrc" ]]; then',
        '  source "$HOME/.zshrc"',
        'fi',
        '',
        '# OSC 633 shell integration (VS Code compatible) + OSC 7 CWD report',
        "__df_preexec() { printf '\\033]633;C\\007'; }",
        "__df_precmd() { printf '\\033]633;D;%s\\007' \"$?\"; printf '\\033]7;file://%s%s\\007' \"$HOSTNAME\" \"$PWD\"; }",
        'preexec_functions+=(__df_preexec)',
        'precmd_functions+=(__df_precmd)',
        '',
      ].join('\n');
      fs.writeFileSync(path.join(tmpDir, '.zshrc'), zshrc);
      return { args: ['-l'], env: { ZDOTDIR: tmpDir }, cleanupDir: tmpDir, integrated: true };
    }
    if (shell.includes('bash')) {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'df-bash-'));
      const bashrc = [
        '# DesktopFairy shell integration (auto-generated)',
        '[ -f ~/.bashrc ] && source ~/.bashrc',
        '[ -f ~/.bash_profile ] && source ~/.bash_profile',
        '',
        '# OSC 633 shell integration (VS Code compatible) + OSC 7 CWD report',
        '__df_in_cmd=0',
        "__df_preexec() { if [[ $__df_in_cmd -eq 0 ]]; then __df_in_cmd=1; printf '\\033]633;C\\007'; fi; }",
        "__df_precmd() { __df_in_cmd=0; printf '\\033]633;D;%s\\007' \"$?\"; printf '\\033]7;file://%s%s\\007' \"$HOSTNAME\" \"$PWD\"; }",
        "trap '__df_preexec' DEBUG",
        'PROMPT_COMMAND="__df_precmd${PROMPT_COMMAND:+; $PROMPT_COMMAND}"',
        '',
      ].join('\n');
      fs.writeFileSync(path.join(tmpDir, '.bashrc'), bashrc);
      return { args: ['--rcfile', path.join(tmpDir, '.bashrc')], env: {}, cleanupDir: tmpDir, integrated: true };
    }
  } catch { /* fall through to unsupported */ }
  return { args: ['-l'], env: {}, cleanupDir: null, integrated: false };
}

function cleanupSessionDir(session) {
  if (session.integrationDir) {
    try { fs.rmSync(session.integrationDir, { recursive: true, force: true }); } catch { /* ignore */ }
    session.integrationDir = null;
  }
}

function cleanupCapture(session) {
  const cap = session.capture;
  if (!cap) return;
  if (cap.timer) {
    clearTimeout(cap.timer);
    cap.timer = null;
  }
  if (cap.startFallbackTimer) {
    clearTimeout(cap.startFallbackTimer);
    cap.startFallbackTimer = null;
  }
  if (cap.stopFallbackTimer) {
    clearTimeout(cap.stopFallbackTimer);
    cap.stopFallbackTimer = null;
  }
  if (cap.signal && cap.onAbort) {
    cap.signal.removeEventListener('abort', cap.onAbort);
    cap.onAbort = null;
  }
  session.capture = null;
}

function stopActiveCapture(sessionId) {
  const session = sessionId ? sessions.get(sessionId) : null;
  if (!session || !session.capture) return false;
  const cap = session.capture;
  if (cap.done) return false;
  try { session.ptyProcess.write('\x03'); } catch { /* dead */ }
  // If shell integration isn't active (e.g. inside SSH), the precmd hook
  // won't emit the end marker after Ctrl-C. Send one manually with exit
  // code 130 (128 + SIGINT 2).
  if (!cap.started) {
    try { session.ptyProcess.write("printf '\\033]633;D;130\\007'\n"); } catch { /* dead */ }
  }
  cap.stopFallbackTimer = setTimeout(() => {
    if (session.capture === cap && !cap.done) {
      cleanupCapture(session);
      cap.reject(new Error('命令已被终止'));
    }
  }, 500);
  return true;
}

function registerPtyHandlers({ ipcMain }) {
  ipcMain.handle('pty:create', async (event, { cols, rows, shell, cwd }) => {
    const sessionId = `pty_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const defaultShell = process.env.SHELL || '/bin/zsh';
    const shellName = shell || defaultShell;

    const integration = setupShellIntegration(shellName);

    const ptyProcess = pty.spawn(shellName, integration.args, {
      name: 'xterm-256color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: cwd || process.env.HOME,
      env: { ...buildEnv(), ...integration.env },
    });

    const sender = event.sender;
    const safeSend = (channel, data) => {
      try {
        if (!sender.isDestroyed()) sender.send(channel, data);
      } catch { /* receiver gone */ }
    };

    const session = {
      ptyProcess,
      sender,
      sessionId,
      capture: null,
      shellIntegrated: integration.integrated,
      integrationDir: integration.cleanupDir,
      cwd: null,
      pipeline: createSessionPipeline(),
    };

    const batchBuffer = [];
    let flushTimer = null;

    const flushBatch = () => {
      if (!batchBuffer.length) return;
      const rawBatch = batchBuffer.join('');
      batchBuffer.length = 0;

      // UTF-8 boundary fixup first — cap.buffer string and pipeline both need
      // complete characters, otherwise CJK/emoji would render as U+FFFD when
      // node-pty splits a multi-byte sequence across onData calls.
      const completeBuf = session.pipeline.fixUtf8(Buffer.from(rawBatch, 'utf8'));
      const batch = completeBuf.toString('utf8');

      const cap = session.capture;
      if (cap && !cap.done) {
        cap.buffer += batch;
        if (!cap.started) {
          const startMatch = cap.buffer.match(START_PATTERN);
          if (startMatch) {
            cap.started = true;
            if (cap.startFallbackTimer) {
              clearTimeout(cap.startFallbackTimer);
              cap.startFallbackTimer = null;
            }
            cap.buffer = cap.buffer.slice(startMatch.index + startMatch[0].length);
          }
        }
        // Match end marker regardless of whether start was received.
        // - With shell integration (started=true): output is between markers.
        // - Without (started=false, e.g. SSH): output is from buffer start
        //   to the end marker (includes command echo, but exit code is
        //   correct since $? is preserved by the interactive shell).
        const endMatch = cap.buffer.match(END_PATTERN);
        if (endMatch) {
          const output = cap.buffer.slice(0, endMatch.index);
          const exitCode = parseInt(endMatch[1], 10);
          cap.done = true;
          cleanupCapture(session);
          cap.resolve({ output: stripAnsi(output), exitCode, remote: !!cap.remoteNote, remoteNote: cap.remoteNote });
        }
      }

      // Pipeline: strip residual OSC 633 markers + extract OSC 7/1337 CWD.
      // OSC 633 sequences are VS Code-private and ignored by xterm, but in
      // fallback scenarios a manual printf can emit duplicate end markers
      // that show up as visible noise — strip them. OSC 7/1337 update
      // session.cwd for Agent context injection.
      const processed = session.pipeline.filter(completeBuf, session);
      safeSend('pty:output', { sessionId, data: processed.toString('utf8') });
    };

    ptyProcess.onData((data) => {
      batchBuffer.push(data);
      if (!flushTimer) {
        flushTimer = setTimeout(() => {
          flushTimer = null;
          flushBatch();
        }, 16);
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
        if (batchBuffer.length) flushBatch();
      }

      if (session.capture) {
        const cap = session.capture;
        cleanupCapture(session);
        const partial = stripAnsi(cap.buffer);
        if (partial) {
          cap.resolve({ output: partial, exitCode: -1, remote: !!cap.remoteNote, remoteNote: cap.remoteNote });
        } else {
          cap.reject(new Error('终端进程已退出'));
        }
      }

      cleanupSessionDir(session);
      safeSend('pty:exit', { sessionId, exitCode });
      sessions.delete(sessionId);
    });

    sessions.set(sessionId, session);
    return { sessionId };
  });

  ipcMain.handle('pty:input', async (_event, { sessionId, data }) => {
    const session = sessions.get(sessionId);
    if (session) session.ptyProcess.write(data);
  });

  ipcMain.handle('pty:resize', async (_event, { sessionId, cols, rows }) => {
    const session = sessions.get(sessionId);
    if (session) session.ptyProcess.resize(cols, rows);
  });

  ipcMain.handle('pty:kill', async (_event, { sessionId }) => {
    const session = sessions.get(sessionId);
    if (session) {
      if (session.capture) {
        const cap = session.capture;
        cleanupCapture(session);
        cap.reject(new Error('终端会话已被终止'));
      }
      cleanupSessionDir(session);
      session.ptyProcess.kill();
      sessions.delete(sessionId);
    }
  });

  ipcMain.handle('terminal:agent:stop', async (_event, { sessionId }) => {
    // SSH 会话的 capture 在 sshService 中管理，按前缀路由。
    if (sessionId && sessionId.startsWith('ssh_')) {
      const { stopSshActiveCapture } = require('./sshService.cjs');
      return { ok: stopSshActiveCapture(sessionId) };
    }
    return { ok: stopActiveCapture(sessionId) };
  });
}

function runCommandInSession(sessionId, command, timeout = 60_000, signal) {
  return new Promise((resolve, reject) => {
    const session = sessionId ? sessions.get(sessionId) : null;
    if (!session) {
      reject(new Error('终端会话不存在或已关闭'));
      return;
    }
    if (session.capture) {
      reject(new Error('上一条命令仍在执行中'));
      return;
    }

    const cap = {
      buffer: '',
      started: false,
      done: false,
      resolve,
      reject,
      timer: null,
      startFallbackTimer: null,
      stopFallbackTimer: null,
      signal: signal || null,
      onAbort: null,
      remoteNote: null,
      fallbackSent: false, // fallback printf 是否已发送（用于处理重复 end marker）
    };

    const timeoutMs = Math.max(5_000, Math.min(Number(timeout) || 60_000, 600_000));
    cap.timer = setTimeout(() => {
      cleanupCapture(session);
      const partial = stripAnsi(cap.buffer);
      reject(new Error(`Terminal command timed out${partial ? `\n\n已捕获的部分输出：\n${partial}` : ''}`));
    }, timeoutMs);

    if (signal && !signal.aborted) {
      cap.onAbort = () => { stopActiveCapture(sessionId); };
      signal.addEventListener('abort', cap.onAbort, { once: true });
    } else if (signal && signal.aborted) {
      reject(new Error('已取消'));
      return;
    }

    session.capture = cap;

    // Foreground-process gate (async). Classify what the PTY's controlling
    // terminal is currently running before writing anything. This prevents
    // blind-typing commands into vim/python/less/etc. and tags SSH sessions
    // as remote so the AI can be told (via the resolved result) that commands
    // run on a remote host.
    detectForeground(session).then((fg) => {
      if (fg.kind === 'blocked') {
        cleanupCapture(session);
        reject(new Error(
          `终端前台正在运行 "${fg.comm || '未知程序'}"，无法发送命令。请先退出该程序（如 :q / exit / Ctrl-D）再让 AI 执行。`
        ));
        return;
      }
      if (fg.kind === 'unknown') {
        // ps 不可用或失败 — 无法安全判断前台状态，拒绝盲写以避免误操作 vim/less 等。
        cleanupCapture(session);
        reject(new Error(
          '无法检测终端前台状态（ps 不可用或返回异常）。请确认当前 shell 处于空闲状态后重试。'
        ));
        return;
      }
      if (fg.kind === 'remote') {
        cap.remoteNote = '⚠️ 命令在 SSH 远程会话' + (fg.remoteHost ? '（' + fg.remoteHost + '）' : '') + '中执行。';
      }

      // Unified adaptive path (works for local shell AND SSH):
      //
      // 1. Write `command\n` — no wrapper, no stty, no printf.
      //    If shell integration hooks are active (local shell), preexec
      //    fires immediately and emits OSC 633;C → cap.started becomes
      //    true in flushBatch, and startFallbackTimer is cancelled.
      //
      // 2. If no OSC 633;C arrives within 500ms (e.g. SSH session where
      //    the remote shell has no hooks), send a fallback printf that
      //    emits OSC 633;D with the command's exit code. $? holds the
      //    exit code of the last command in an interactive shell, so
      //    this works even over SSH where hooks can't fire.
      //
      // 3. flushBatch resolves the capture when OSC 633;D is matched,
      //    whether or not OSC 633;C was seen:
      //    - started=true  → output between markers (clean)
      //    - started=false → output from buffer start to end marker
      //      (includes command echo, but exit code is correct)
      try {
        session.ptyProcess.write(command + '\n');
      } catch (e) {
        cleanupCapture(session);
        reject(new Error('无法写入终端: ' + String(e?.message || e)));
        return;
      }

      cap.startFallbackTimer = setTimeout(() => {
        if (cap.started || cap.done) return;
        // Shell integration not active (e.g. inside an SSH session).
        // The command may still be running, but we need to emit the end
        // marker ourselves. $? is NOT available yet while the command
        // runs, so we defer: this printf will execute after the command
        // completes (keystrokes are queued in the shell's input buffer).
        cap.fallbackSent = true;
        try {
          session.ptyProcess.write("printf '\\033]633;D;%s\\007' \"$?\"\n");
        } catch { /* dead */ }
      }, 500);
    }).catch(() => {
      // Detection failed (ps unavailable, etc.) — 拒绝盲写，避免误操作 vim/less。
      cleanupCapture(session);
      reject(new Error(
        '无法检测终端前台状态（ps 不可用或返回异常）。请确认当前 shell 处于空闲状态后重试。'
      ));
    });
  });
}

function killAllSessions() {
  for (const [id, session] of sessions) {
    if (session.capture) {
      const cap = session.capture;
      cleanupCapture(session);
      cap.reject(new Error('终端会话已被终止'));
    }
    cleanupSessionDir(session);
    try { session.ptyProcess.kill(); } catch { /* already dead */ }
    sessions.delete(id);
  }
}

function killSessionsForSender(sender) {
  for (const [id, session] of sessions) {
    if (session.sender === sender) {
      if (session.capture) {
        const cap = session.capture;
        cleanupCapture(session);
        cap.reject(new Error('终端会话已被终止'));
      }
      cleanupSessionDir(session);
      try { session.ptyProcess.kill(); } catch {}
      sessions.delete(id);
    }
  }
}

module.exports = {
  registerPtyHandlers,
  runCommandInSession,
  stopActiveCapture,
  killAllSessions,
  killSessionsForSender,
  getTerminalForeground,
};
