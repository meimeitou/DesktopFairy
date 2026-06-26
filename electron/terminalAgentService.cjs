const { runCommandInSession } = require('./ptyService.cjs');

function runCommandInRenderer(_sender, { sessionId, command, timeout = 60_000, signal }) {
  return runCommandInSession(sessionId, command, timeout, signal);
}

module.exports = {
  runCommandInRenderer,
};
