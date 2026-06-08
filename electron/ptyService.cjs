const pty = require('node-pty');

const sessions = new Map();

function registerPtyHandlers({ ipcMain }) {
  ipcMain.handle('pty:create', async (event, { cols, rows, shell, cwd }) => {
    const sessionId = `pty_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const defaultShell = process.env.SHELL || '/bin/zsh';

    // Build a clean env for posix_spawn — macOS has a ~256KB limit on total
    // env size.  Electron injects many extra variables (ELECTRON_*, CHROMIUM_*
    // etc.) that can push the total over that limit, causing posix_spawnp to
    // fail.  We keep only the essential vars and always set a sane PATH.
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
    // Ensure a working PATH (don't rely on Electron's possibly-stripped env)
    env.PATH = process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';
    // Shell-specific rc files may reference these
    if (process.env.SHELL) env.SHELL = process.env.SHELL;
    if (process.env.XDG_CONFIG_HOME) env.XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME;
    if (process.env.HOMEBREW_PREFIX) env.HOMEBREW_PREFIX = process.env.HOMEBREW_PREFIX;

    const ptyProcess = pty.spawn(shell || defaultShell, ['-l'], {
      name: 'xterm-256color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: cwd || process.env.HOME,
      env,
    });

    const sender = event.sender;
    const safeSend = (channel, data) => {
      try {
        if (!sender.isDestroyed()) sender.send(channel, data);
      } catch { /* receiver gone */ }
    };

    const batchBuffer = [];
    let flushTimer = null;

    ptyProcess.onData((data) => {
      batchBuffer.push(data);
      if (!flushTimer) {
        flushTimer = setTimeout(() => {
          const batch = batchBuffer.join('');
          batchBuffer.length = 0;
          flushTimer = null;
          safeSend('pty:output', { sessionId, data: batch });
        }, 16);
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
        if (batchBuffer.length) {
          safeSend('pty:output', { sessionId, data: batchBuffer.join('') });
          batchBuffer.length = 0;
        }
      }
      safeSend('pty:exit', { sessionId, exitCode });
      sessions.delete(sessionId);
    });

    sessions.set(sessionId, { ptyProcess, sender });
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
      session.ptyProcess.kill();
      sessions.delete(sessionId);
    }
  });
}

function killAllSessions() {
  for (const [id, session] of sessions) {
    try { session.ptyProcess.kill(); } catch { /* already dead */ }
    sessions.delete(id);
  }
}

function killSessionsForSender(sender) {
  for (const [id, session] of sessions) {
    if (session.sender === sender) {
      try { session.ptyProcess.kill(); } catch {}
      sessions.delete(id);
    }
  }
}

module.exports = { registerPtyHandlers, killAllSessions, killSessionsForSender };
