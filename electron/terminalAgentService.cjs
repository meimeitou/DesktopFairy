const { runCommandInSession } = require('./ptyService.cjs');
const { runCommandInSshSession } = require('./sshService.cjs');

function runCommandInRenderer(_sender, { sessionId, command, timeout = 60_000, signal }) {
  // SSH 会话（ssh_ 前缀）存在 sshService 的独立 Map 中，
  // PTY 会话（pty_ 前缀）存在 ptyService 的 Map 中。按前缀路由。
  if (sessionId && sessionId.startsWith('ssh_')) {
    return runCommandInSshSession(sessionId, command, timeout, signal);
  }
  return runCommandInSession(sessionId, command, timeout, signal);
}

module.exports = {
  runCommandInRenderer,
};
