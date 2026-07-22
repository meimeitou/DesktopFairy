// SSH terminal session management using the ssh2 library.
// Each SSH session opens a remote shell with PTY allocation and pipes
// data bidirectionally between the renderer (xterm.js) and the SSH stream.
// Unlike ptyService.cjs, there is no shell integration injection — the remote
// shell uses its own configuration. OSC 633/7 capture and CWD tracking are
// not available for SSH sessions.
//
// ProxyJump 支持：若 SshHost.proxyJump 提供（格式 "[user@]host[:port]"），
// 先连跳板机（仅 SSH Agent 认证），再 forwardOut 到目标 host:port，
// 最终通过跳板机建立的 stream 连接目标。
const { Client } = require('ssh2');
const fs = require('fs');
const os = require('os');
const path = require('path');

const sessions = new Map();

// OSC 633 markers — same protocol as ptyService.cjs. Remote shells have no
// shell integration hooks, so START never fires; the fallback printf emits
// the END marker with $?. Both stdout and stderr are captured.
const START_PATTERN = /\x1b\]633;C\x07/;
const END_PATTERN = /\x1b\]633;D;(-?\d+)\x07/;

function stripAnsi(str) {
  if (!str) return str;
  return str
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
    .replace(/\x1B\][^\x07\x1b]*(?:\x07|\x1B\\)/g, '');
}

function trackOsc633CommandState(session, text) {
  if (!text || !session) return;
  if (START_PATTERN.test(text)) session.commandRunning = true;
  if (END_PATTERN.test(text)) session.commandRunning = false;
}

function isSshSessionBusy(sessionId) {
  const session = sessionId ? sessions.get(sessionId) : null;
  if (!session) return { busy: false };
  if (session.capture) return { busy: true, reason: 'agent' };
  if (session.commandRunning) return { busy: true, reason: 'command' };
  return { busy: false };
}

// 展开 ~/ 和 ~ 为 os.homedir()。~user/ 不处理（需要 passwd 查询）。
// 参考 tabby 第三方插件 tabby-ssh-keymap 的 ~ 展开做法。
function expandTilde(p) {
  if (typeof p !== 'string' || !p) return p;
  if (p === '~') return os.homedir();
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}

// 在 ~/.ssh/ 下扫描默认私钥文件，返回所有可读的 Buffer 数组。
// 对齐 tabby 的 PrivateKeyLocator 实现：扫描 ^id_[\w\d]+$ 模式的文件（不含 .pub）。
// auto 模式下用户未填 privateKeyPath 时调用，模拟系统 ssh 的默认行为。
function findDefaultPrivateKeys() {
  const sshDir = path.join(os.homedir(), '.ssh');
  let files;
  try {
    files = fs.readdirSync(sshDir);
  } catch {
    return [];
  }
  const results = [];
  for (const name of files) {
    if (!/^id_[\w\d]+$/.test(name)) continue;
    try {
      const full = path.join(sshDir, name);
      const stat = fs.statSync(full);
      if (stat.isFile()) {
        results.push(fs.readFileSync(full));
      }
    } catch {
      // 不存在或不可读，继续
    }
  }
  return results;
}

// 解析 "[user@]host[:port]" → { username?, host, port } 或 null
function parseProxyJump(pj) {
  if (!pj || typeof pj !== 'string') return null;
  let s = pj.trim();
  if (!s) return null;
  let username;
  const atIdx = s.lastIndexOf('@');
  if (atIdx > 0) {
    username = s.slice(0, atIdx);
    s = s.slice(atIdx + 1);
  }
  let port;
  const colonIdx = s.lastIndexOf(':');
  if (colonIdx > 0) {
    const p = Number(s.slice(colonIdx + 1));
    if (Number.isFinite(p) && p > 0 && p < 65536) {
      port = p;
      s = s.slice(0, colonIdx);
    }
  }
  if (!s) return null;
  return { username, host: s, port: port || 22 };
}

// 把认证凭据注入到 connectConfig（不含 sock）。返回 { error? }。
// authMethod='auto' 时同时传入所有可用凭据（agent + privateKey + password），
// ssh2 会按服务端在 USERAUTH_FAILURE 里返回的 methods 列表依次尝试。
// 参考 tabby 的 Auto 认证模式。失败返回 { error }，成功返回 {}（cfg 原地修改）。
function applyAuth(cfg, { authMethod, password, privateKeyPath }) {
  const isAuto = authMethod === 'auto';

  // Agent
  if ((isAuto || authMethod === 'agent') && process.env.SSH_AUTH_SOCK) {
    cfg.agent = process.env.SSH_AUTH_SOCK;
  }

  // Private key
  if (isAuto || authMethod === 'privateKey') {
    if (privateKeyPath) {
      // 用户指定了路径
      const resolved = expandTilde(privateKeyPath);
      try {
        cfg.privateKey = fs.readFileSync(resolved);
      } catch (e) {
        // auto 模式下读不到不致命，继续尝试默认私钥；其他模式报错
        if (!isAuto) return { error: `无法读取私钥: ${e.message}` };
      }
    }
    // auto 模式下若还没拿到私钥，扫描 ~/.ssh/ 默认文件（对齐 tabby PrivateKeyLocator）
    // tabby 扫描 ^id_[\w\d]+$ 模式的所有文件；ssh2 只接受单个 privateKey，取第一个
    if (isAuto && !cfg.privateKey) {
      const defaultKeys = findDefaultPrivateKeys();
      if (defaultKeys.length > 0) cfg.privateKey = defaultKeys[0];
    }
  }

  // Password
  if ((isAuto ? password : authMethod === 'password') && password) {
    cfg.password = password;
  }

  return {};
}

// 由 SshHost 字段构造 ssh2 connectConfig（不含 sock）。失败返回 { error }。
function buildConnectConfig({ host, port, user, authMethod, password, privateKeyPath }) {
  const cfg = {
    host,
    port: port || 22,
    username: user,
    readyTimeout: 30000,
    keepaliveInterval: 5000,
  };
  const err = applyAuth(cfg, { authMethod, password, privateKeyPath });
  if (err.error) return err;
  return { config: cfg };
}

// 处理跳板：若有 proxyJump，先连跳板机（全套认证，缺省 auto），再 forwardOut 到目标，
// 返回 { conn, jumpConn? } 或 { error }。
// jumpAuth = { authMethod, password, privateKeyPath }；authMethod 缺省按 'auto' 处理，
// 与 ssh CLI 一致（agent + ~/.ssh 默认私钥 + 密码）。
function connectWithJump(connectConfig, proxyJump, jumpAuth = {}) {
  const jump = parseProxyJump(proxyJump);
  if (!jump) {
    // 直连
    return new Promise((resolve) => {
      const conn = new Client();
      let settled = false;
      const done = (r) => { if (!settled) { settled = true; resolve(r); } };
      conn.on('ready', () => done({ conn }));
      conn.on('error', (err) => done({ error: err.message }));
      conn.connect(connectConfig);
    });
  }
  // 跳板链：先连 jump，再 forwardOut 到目标 host:port
  return new Promise((resolve) => {
    const jumpConn = new Client();
    let settled = false;
    const done = (r) => { if (!settled) { settled = true; resolve(r); } };
    const jumpConfig = {
      host: jump.host,
      port: jump.port,
      username: jump.username || connectConfig.username,
      readyTimeout: 30000,
      keepaliveInterval: 5000,
    };
    // 跳板机走全套认证（agent + privateKey + password），缺省 auto。
    // 旧版仅 agent，无法覆盖 key 在 ~/.ssh/ 但未 ssh-add 的常见场景。
    const authErr = applyAuth(jumpConfig, {
      authMethod: jumpAuth.authMethod || 'auto',
      password: jumpAuth.password,
      privateKeyPath: jumpAuth.privateKeyPath,
    });
    if (authErr.error) return resolve(authErr);
    jumpConn.on('ready', () => {
      const targetHost = connectConfig.host;
      const targetPort = connectConfig.port || 22;
      jumpConn.forwardOut('127.0.0.1', 0, targetHost, targetPort, (err, stream) => {
        if (err) {
          try { jumpConn.end(); } catch { /* already closed */ }
          return done({ error: `跳板转发失败: ${err.message}` });
        }
        // 用 stream 作为 sock 直连目标
        const targetConn = new Client();
        const targetCfg = { ...connectConfig, sock: stream };
        targetConn.on('ready', () => done({ conn: targetConn, jumpConn }));
        targetConn.on('error', (e) => {
          try { jumpConn.end(); } catch { /* already closed */ }
          done({ error: `目标连接失败: ${e.message}` });
        });
        targetConn.connect(targetCfg);
      });
    });
    jumpConn.on('error', (err) => done({ error: `跳板连接失败: ${err.message}` }));
    jumpConn.connect(jumpConfig);
  });
}

function registerSshHandlers({ ipcMain }) {
  ipcMain.handle('ssh:create', async (event, params) => {
    const {
      host, port, user, authMethod, password, privateKeyPath,
      proxyJump, proxyJumpAuthMethod, proxyJumpPassword, proxyJumpPrivateKeyPath,
      cols, rows,
    } = params || {};

    if (!host || !user) {
      return { error: '缺少 host 或 user 参数' };
    }

    const built = buildConnectConfig({ host, port, user, authMethod, password, privateKeyPath });
    if (built.error) return { error: built.error };

    const sessionId = `ssh_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const sender = event.sender;
    const safeSend = (channel, data) => {
      try {
        if (!sender.isDestroyed()) sender.send(channel, data);
      } catch { /* receiver gone */ }
    };

    const jumpAuth = proxyJump ? {
      authMethod: proxyJumpAuthMethod,
      password: proxyJumpPassword,
      privateKeyPath: proxyJumpPrivateKeyPath,
    } : undefined;
    const result = await connectWithJump(built.config, proxyJump, jumpAuth);
    if (result.error) return { error: result.error };

    const { conn, jumpConn } = result;

    return new Promise((resolve) => {
      let settled = false;
      const done = (r) => {
        if (!settled) { settled = true; resolve(r); }
      };

      const shellOpts = {
        term: 'xterm-256color',
        cols: cols || 80,
        rows: rows || 24,
      };
      conn.shell(shellOpts, (err, stream) => {
        if (err) {
          done({ error: err.message });
          try { conn.end(); } catch { /* already closed */ }
          try { jumpConn?.end(); } catch { /* already closed */ }
          return;
        }
        const session = { conn, stream, sender, jumpConn, capture: null, commandRunning: false };
        sessions.set(sessionId, session);

        // Capture hook — coexists with the forward-to-renderer listener.
        // Both fire on every data event; this one buffers for runCommandInSshSession.
        const onCaptureData = (data) => {
          const text = data.toString('utf8');
          trackOsc633CommandState(session, text);
          const cap = session.capture;
          if (!cap || cap.done) return;
          cap.buffer += text;
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
          const endMatch = cap.buffer.match(END_PATTERN);
          if (endMatch) {
            const output = cap.buffer.slice(0, endMatch.index);
            const exitCode = parseInt(endMatch[1], 10);
            cap.done = true;
            cleanupSshCapture(session);
            cap.resolve({ output: stripAnsi(output), exitCode, remote: true, remoteNote: cap.remoteNote });
          }
        };
        stream.on('data', onCaptureData);
        stream.stderr.on('data', onCaptureData);
        stream.on('data', (data) => {
          safeSend('ssh:output', { sessionId, data: data.toString('utf8') });
        });
        stream.stderr.on('data', (data) => {
          safeSend('ssh:output', { sessionId, data: data.toString('utf8') });
        });
        stream.on('close', () => {
          if (session.capture) {
            const cap = session.capture;
            cleanupSshCapture(session);
            const partial = stripAnsi(cap.buffer);
            if (partial) {
              cap.resolve({ output: partial, exitCode: -1, remote: true, remoteNote: cap.remoteNote });
            } else {
              cap.reject(new Error('终端进程已退出'));
            }
          }
          safeSend('ssh:exit', { sessionId });
          sessions.delete(sessionId);
          try { conn.end(); } catch { /* already closed */ }
          try { jumpConn?.end(); } catch { /* already closed */ }
        });

        done({ sessionId });
      });
    });
  });

  ipcMain.handle('ssh:input', (event, { sessionId, data }) => {
    const session = sessions.get(sessionId);
    if (session?.stream) {
      try { session.stream.write(data); } catch { /* dead */ }
    }
    return undefined;
  });

  ipcMain.handle('ssh:resize', (event, { sessionId, cols, rows }) => {
    const session = sessions.get(sessionId);
    if (session?.stream) {
      try { session.stream.setWindow(rows, cols, 0, 0); } catch { /* dead */ }
    }
    return undefined;
  });

  ipcMain.handle('ssh:kill', (event, { sessionId }) => {
    const session = sessions.get(sessionId);
    if (session) {
      try { session.stream?.end(); } catch { /* dead */ }
      try { session.conn?.end(); } catch { /* dead */ }
      try { session.jumpConn?.end(); } catch { /* dead */ }
      sessions.delete(sessionId);
    }
    return undefined;
  });

  ipcMain.handle('ssh:busy', (_event, { sessionId }) => {
    return { ok: true, ...isSshSessionBusy(sessionId) };
  });

  // 测试连接：建立后立即断开，不分配 PTY。返回 { ok: true } 或 { ok: false, error }
  ipcMain.handle('ssh:test', async (event, params) => {
    const { proxyJump, proxyJumpAuthMethod, proxyJumpPassword, proxyJumpPrivateKeyPath } = params || {};
    const built = buildConnectConfig(params || {});
    if (built.error) return { ok: false, error: built.error };
    const jumpAuth = proxyJump ? {
      authMethod: proxyJumpAuthMethod,
      password: proxyJumpPassword,
      privateKeyPath: proxyJumpPrivateKeyPath,
    } : undefined;
    const testResult = await connectWithJump(built.config, proxyJump, jumpAuth);
    if (testResult.error) return { ok: false, error: testResult.error };
    try { testResult.conn.end(); } catch { /* already closed */ }
    try { testResult.jumpConn?.end(); } catch { /* already closed */ }
    return { ok: true };
  });

  // 导入 SSH config 文件：files 为 Array<{ name, content }>
  // 返回 { hosts: SshHost[] }，去重由 renderer 处理。
  ipcMain.handle('ssh:import_configs', async (event, payload) => {
    const { parseSshConfig } = require('./sshConfigParser.cjs');
    const files = payload?.files;
    if (!Array.isArray(files)) return { hosts: [] };
    const all = [];
    for (const f of files) {
      if (!f || typeof f.content !== 'string' || !f.content) continue;
      // 默认用文件路径作分组名，便于多文件导入时区分来源
      const group = (f.path || f.name || '').trim() || undefined;
      const hosts = parseSshConfig(f.content, group);
      all.push(...hosts);
    }
    return { hosts: all };
  });
}

function killAllSshSessions() {
  for (const session of sessions.values()) {
    if (session.capture) {
      const cap = session.capture;
      cleanupSshCapture(session);
      cap.reject(new Error('终端会话已被终止'));
    }
    try { session.stream?.end(); } catch { /* dead */ }
    try { session.conn?.end(); } catch { /* dead */ }
    try { session.jumpConn?.end(); } catch { /* dead */ }
  }
  sessions.clear();
}

function cleanupSshCapture(session) {
  const cap = session.capture;
  if (!cap) return;
  if (cap.timer) { clearTimeout(cap.timer); cap.timer = null; }
  if (cap.startFallbackTimer) { clearTimeout(cap.startFallbackTimer); cap.startFallbackTimer = null; }
  if (cap.stopFallbackTimer) { clearTimeout(cap.stopFallbackTimer); cap.stopFallbackTimer = null; }
  if (cap.signal && cap.onAbort) { cap.signal.removeEventListener('abort', cap.onAbort); cap.onAbort = null; }
  session.capture = null;
}

function stopSshActiveCapture(sessionId) {
  const session = sessionId ? sessions.get(sessionId) : null;
  if (!session || !session.capture) return false;
  const cap = session.capture;
  if (cap.done) return false;
  try { session.stream.write('\x03'); } catch { /* dead */ }
  // Remote shell has no precmd hook — send end marker manually with exit 130.
  try { session.stream.write("printf '\\033]633;D;130\\007'\n"); } catch { /* dead */ }
  cap.stopFallbackTimer = setTimeout(() => {
    if (session.capture === cap && !cap.done) {
      cleanupSshCapture(session);
      cap.reject(new Error('命令已被终止'));
    }
  }, 500);
  return true;
}

// 在 SSH 远程会话中执行命令。与 ptyService.runCommandInSession 对应，
// 但写入 ssh2 stream 而非 ptyProcess。远程 shell 无 shell 集成 hook，
// 走 fallback printf 路径（$? 在交互式 shell 中保留上一条命令的退出码）。
function runCommandInSshSession(sessionId, command, timeout = 60_000, signal) {
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
      remoteNote: '⚠️ 命令在 SSH 远程会话中执行。',
      fallbackSent: false,
    };

    const timeoutMs = Math.max(5_000, Math.min(Number(timeout) || 60_000, 600_000));
    cap.timer = setTimeout(() => {
      cleanupSshCapture(session);
      const partial = stripAnsi(cap.buffer);
      reject(new Error(`Terminal command timed out${partial ? `\n\n已捕获的部分输出：\n${partial}` : ''}`));
    }, timeoutMs);

    if (signal && !signal.aborted) {
      cap.onAbort = () => { stopSshActiveCapture(sessionId); };
      signal.addEventListener('abort', cap.onAbort, { once: true });
    } else if (signal && signal.aborted) {
      reject(new Error('已取消'));
      return;
    }

    session.capture = cap;

    // 写入命令 — 跳过前台进程检测（无法对远程 shell 执行 ps）。
    // 风险：若远程正在 vim/less 等，命令会被盲写进去。由用户确保 shell 空闲。
    try {
      session.stream.write(command + '\n');
    } catch (e) {
      cleanupSshCapture(session);
      reject(new Error('无法写入终端: ' + String(e?.message || e)));
      return;
    }

    // fallback：500ms 内若没收到 OSC 633;C（远程无 hook，必然收不到），
    // 发送 printf 输出 END marker + $?。该 printf 在命令完成后执行（排队在
    // 远程 shell 输入缓冲区）。
    cap.startFallbackTimer = setTimeout(() => {
      if (cap.started || cap.done) return;
      cap.fallbackSent = true;
      try { session.stream.write("printf '\\033]633;D;%s\\007' \"$?\"\n"); } catch { /* dead */ }
    }, 500);
  });
}

module.exports = {
  registerSshHandlers,
  killAllSshSessions,
  runCommandInSshSession,
  stopSshActiveCapture,
  isSshSessionBusy,
};
