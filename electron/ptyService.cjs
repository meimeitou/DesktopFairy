const pty = require('node-pty');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
      const zshrc = [
        '# DesktopFairy shell integration (auto-generated)',
        userZdotdir ? `ZDOTDIR=${shellQuote(userZdotdir)}` : 'unset ZDOTDIR',
        '[[ -f "$ZDOTDIR/.zshrc" ]] && source "$ZDOTDIR/.zshrc" || [[ -f "$HOME/.zshrc" ]] && source "$HOME/.zshrc"',
        '',
        '# OSC 633 shell integration (VS Code compatible)',
        "__df_preexec() { printf '\\033]633;C\\007'; }",
        "__df_precmd() { printf '\\033]633;D;%s\\007' \"$?\"; }",
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
        '# OSC 633 shell integration (VS Code compatible)',
        '__df_in_cmd=0',
        "__df_preexec() { if [[ $__df_in_cmd -eq 0 ]]; then __df_in_cmd=1; printf '\\033]633;C\\007'; fi; }",
        "__df_precmd() { __df_in_cmd=0; printf '\\033]633;D;%s\\007' \"$?\"; }",
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
    };

    const batchBuffer = [];
    let flushTimer = null;

    const flushBatch = () => {
      if (!batchBuffer.length) return;
      const batch = batchBuffer.join('');
      batchBuffer.length = 0;

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
          cap.resolve({ output: stripAnsi(output), exitCode });
        }
      }

      safeSend('pty:output', { sessionId, data: batch });
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
          cap.resolve({ output: partial, exitCode: -1 });
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
      try {
        session.ptyProcess.write("printf '\\033]633;D;%s\\007' \"$?\"\n");
      } catch { /* dead */ }
    }, 500);
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
};
