/** Environment comes from persisted topic/session bindings, never an agent role. */
function resolveAgentEnvironment({
  topicId,
  terminalSessionId,
  sender,
  hostConversationService,
  getSessionService = (id) => id.startsWith('ssh_') ? require('./sshService.cjs') : require('./ptyService.cjs'),
}) {
  if (terminalSessionId) {
    if (!topicId?.startsWith('terminal:') && !topicId?.startsWith('legacy:')) {
      throw new Error('终端请求缺少终端对话标识');
    }
    const service = getSessionService(terminalSessionId);
    const session = service.getOwnedSession(terminalSessionId, sender);
    const assertValid = () => service.getOwnedSession(terminalSessionId, sender);
    const hostRuntime = hostConversationService.resolveTerminalRuntime(session, terminalSessionId, assertValid);
    const context = session.savedHostId ? 'terminal-ssh' : 'terminal';
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
  return {
    context: 'local',
    hostRuntime: null,
    assertValid: () => {
      if (topic && !hostConversationService.getTopic(topicId)) throw new Error('对话已被删除');
    },
  };
}

module.exports = { resolveAgentEnvironment };
