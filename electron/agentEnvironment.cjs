/** Environment comes from persisted topic/session bindings, never an agent role. */
function resolveAgentEnvironment({
  topicId,
  terminalSessionId,
  selectedHosts,
  sender,
  hostConversationService,
  getSessionService = (id) => id.startsWith('ssh_') ? require('./sshService.cjs') : require('./ptyService.cjs'),
}) {
  if (selectedHosts?.length) {
    const hostRuntime = hostConversationService.resolveSelectedHostsRuntime(topicId, selectedHosts);
    return { context: 'host', hostRuntime, assertValid: hostRuntime.assertValid };
  }
  if (terminalSessionId) {
    if (!topicId?.startsWith('terminal:') && !topicId?.startsWith('legacy:')) {
      throw new Error('终端请求缺少终端对话标识');
    }
    const service = getSessionService(terminalSessionId);
    const session = service.getOwnedSession(terminalSessionId, sender);
    const assertValid = () => service.getOwnedSession(terminalSessionId, sender);
    const hostRuntime = hostConversationService.resolveTerminalRuntime(session, terminalSessionId, assertValid);
    // Both local and SSH terminal sessions use the same 'terminal' context.
    // The system prompt differentiates via terminalState.kind (local vs remote).
    const context = 'terminal';
    return {
      context,
      hostRuntime,
      getTerminalState: () => terminalSessionId.startsWith('ssh_')
        ? Promise.resolve({ kind: 'remote', remoteHost: `${session.remoteUser}@${session.remoteHost}` })
        : service.getTerminalForeground(terminalSessionId),
      assertValid: () => {
        assertValid();
        hostRuntime.assertValid();
      },
    };
  }
  if (topicId?.startsWith('terminal:')) throw new Error('终端已断开，请重新连接后再发送');
  const topic = topicId ? hostConversationService?.getTopic(topicId) : null;
  if (topicId && !topic && !topicId.startsWith('legacy:')) throw new Error('对话不存在或已被删除');
  if (topic?.host) {
    const hostRuntime = hostConversationService.resolveHostRuntime(topicId);
    return { context: 'host', hostRuntime, assertValid: hostRuntime.assertValid };
  }
  // Terminal-page local conversations (origin === 'terminal') share SSH tools
  // with the terminal drawer but run commands via bash (no terminal session).
  // Terminal tool is blocked; bash is opt-in (defaultDisabled).
  if (topic?.origin === 'terminal') {
    const hostRuntime = hostConversationService.resolveLocalConversationRuntime(topicId);
    return {
      context: 'terminal-local',
      hostRuntime,
      assertValid: hostRuntime.assertValid,
    };
  }
  // Local conversations: ssh_* are defaultDisabled but can be enabled.
  // Provide a hostRuntime so they work when turned on.
  const localHostRuntime = topicId && topic && hostConversationService?.resolveLocalConversationRuntime
    ? (() => { try { return hostConversationService.resolveLocalConversationRuntime(topicId); } catch { return null; } })()
    : null;
  return {
    context: 'local',
    hostRuntime: localHostRuntime,
    assertValid: () => {
      if (topic && !hostConversationService.getTopic(topicId)) throw new Error('对话已被删除');
    },
  };
}

module.exports = { resolveAgentEnvironment };
