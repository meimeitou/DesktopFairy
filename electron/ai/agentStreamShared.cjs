const { getEnabledOpenAiToolDefinitions, resolveToolApprovalMode } = require('../agentBuiltinCatalog.cjs');
const { getSkillsDir } = require('../agentSkillService.cjs');
const { wrapMcpToolExecute } = require('./topicBroadcast.cjs');

function getBuiltinTools(agentConfig, context) {
  return getEnabledOpenAiToolDefinitions(agentConfig, context).map(({ type, function: fn }) => ({
    type,
    function: fn,
  }));
}

function buildSkillEnvVars(agentConfig) {
  return {
    ...(agentConfig?.envVars || {}),
    DESKTOP_FAIRY_SKILLS_DIR: getSkillsDir(),
  };
}

/**
 * Shared toolDeps fields for AI SDK agent runs (ai:stream_open + legacy agent:run).
 */
function buildAgentToolDeps({
  topicId,
  requestId,
  agentConfig,
  mcpRuntime,
  signal,
  registerMcpCall,
  getWindows,
  parentWindow,
  sender,
  safeSend,
  getBypassApproval,
  onApprovalWaitStart,
  webSearchConfig,
  terminalSessionId,
  suppressToolDoneEvent = true,
}) {
  const sessionEnabledSkillIds = new Set(agentConfig?.enabledSkillIds || []);

  return {
    getWindows,
    parentWindow,
    sender,
    agentConfig,
    topicId,
    toolApprovalMode: resolveToolApprovalMode(agentConfig),
    get bypassApproval() {
      return getBypassApproval?.() === true;
    },
    onApprovalWaitStart,
    envVars: buildSkillEnvVars(agentConfig),
    enabledSkillIds: agentConfig.enabledSkillIds || [],
    sessionEnabledSkillIds,
    persistEnabledSkillId: undefined,
    executeMcpTool: wrapMcpToolExecute(mcpRuntime, {
      topicId,
      signal,
      registerMcpCall,
    }),
    safeSend,
    requestId,
    signal,
    webSearchConfig,
    terminalSessionId,
    suppressToolDoneEvent,
  };
}

module.exports = {
  getBuiltinTools,
  buildSkillEnvVars,
  buildAgentToolDeps,
};
