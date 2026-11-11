const { resolveAgentEnvironment } = require('../agentEnvironment.cjs');
const { streamText } = require('./AiService.cjs');
const { getBuiltinTools, buildAgentToolDeps } = require('./agentStreamShared.cjs');
const {
  buildAgentSystemPrompt,
  getCurrentWebSearchConfig,
} = require('../agentService.cjs');
const { loadMcpToolDefinitions } = require('../agentMcpClient.cjs');
const { getServersByIds } = require('../mcpServerService.cjs');
const settingsSnapshot = require('../settingsSnapshot.cjs');

function abortIfNeeded(signal) {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
}

/**
 * createStream callback for AiStreamManager. Assigns ctx.mcpRuntime as MCP
 * loads so the IPC handler can dispose it on done/error.
 */
function createAgentTextStream(ctx) {
  return async () => {
    const {
      manager,
      topicId,
      requestId,
      terminalSessionId,
      sender,
      agentConfig,
      apiConfig,
      apiMessages,
      knowledgeBaseIds,
      maxTurns,
      bridge,
      legacySend,
      topicAgentState,
      getWindows,
      parentWindow,
      hostConversationService,
      protectedDir,
    } = ctx;

    const entry = manager.activeStreams.get(topicId);
    const signal = entry?.controller?.signal;
    abortIfNeeded(signal);

    const environment = resolveAgentEnvironment({
      topicId,
      terminalSessionId,
      sender,
      hostConversationService,
      selectedHosts: ctx.selectedHosts,
    });
    const { context, hostRuntime } = environment;
    ctx.mcpRuntime = await loadMcpToolDefinitions(getServersByIds(agentConfig.mcpServerIds));
    abortIfNeeded(signal);

    const terminalState = environment.getTerminalState ? await environment.getTerminalState() : null;
    abortIfNeeded(signal);
    const builtinTools = getBuiltinTools(agentConfig, context, knowledgeBaseIds);
    const toolDefinitions = [...builtinTools, ...(ctx.mcpRuntime?.definitions || [])];
    const enabledToolNames = builtinTools.map((t) => t.function.name);
    const hostInfo = hostRuntime?.hostId
      ? {
          defaultHostName: hostRuntime.hostName,
          defaultHostUser: hostRuntime.hostUser,
          cwd: hostRuntime.getCwd(hostRuntime.topicId, hostRuntime.hostId) || '',
        }
      : null;
    const baseSystemPrompt = buildAgentSystemPrompt(
      agentConfig,
      context,
      terminalState,
      enabledToolNames,
      settingsSnapshot.getSnapshot()?.sshHosts || [],
      hostInfo,
    );

    const selectedHostsPrompt = require('../hostSelection.cjs').buildSelectedHostsPrompt(hostRuntime?.selectedHosts);
    const systemPrompt = [baseSystemPrompt, ctx.selectedSkillsPrompt, selectedHostsPrompt].filter(Boolean).join('\n\n');

    const toolDeps = buildAgentToolDeps({
      topicId,
      requestId,
      agentConfig,
      mcpRuntime: ctx.mcpRuntime,
      knowledgeBaseIds,
      signal,
      registerMcpCall: (tid, callId) => manager.registerMcpCall(tid, callId),
      getWindows,
      parentWindow,
      sender,
      safeSend: legacySend,
      getBypassApproval: () => topicAgentState.get(topicId)?.bypassApproval === true,
      onApprovalWaitStart: () => {
        const live = manager.activeStreams.get(topicId);
        if (live?.idle) manager.extendIdleForApproval(topicId, live.idle);
      },
      webSearchConfig: getCurrentWebSearchConfig(),
      terminalSessionId: context === 'host' ? undefined : terminalSessionId,
      suppressToolDoneEvent: true,
      onToolDenied: bridge.markDenied,
      onToolArgs: bridge.setToolArgs,
      context,
      hostRuntime,
      assertEnvironment: environment.assertValid,
      protectedDir,
    });

    return streamText({
      messages: apiMessages,
      systemPrompt,
      apiConfig,
      toolDefinitions,
      toolDeps,
      maxTurns,
      reasoningEffort: agentConfig.reasoningEffort,
      signal,
    });
  };
}

module.exports = {
  createAgentTextStream,
};
