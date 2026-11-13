const environmentPolicy = require('./agentEnvironmentPolicy.json');
const toolCatalog = require('./agentBuiltinCatalogData.json');
const {
  CLAUDE_CODE_BUILTIN_TOOLS,
  TOOL_LABELS,
  getOpenAiToolParameters,
} = require('./agentBuiltinDefinitions.cjs');

/**
 * Legacy (Cherry-aligned capitalized) tool ids → pi-contract lowercase ids.
 * Applied when reading persisted user settings so saved tool toggles keep
 * working after the id migration. Shared with the renderer via agentBuiltinCatalogData.json.
 */
const LEGACY_TOOL_ID_MAP = toolCatalog.legacyToolIdMap;

function mapLegacyToolId(id) {
  return LEGACY_TOOL_ID_MAP[id] || id;
}

const DEFAULT_SAFE_TOOLS = new Set(toolCatalog.defaultSafeTools);

/** Enabled by default; only chatMode rules (full-auto) may hide from the model. */
const ALWAYS_ENABLED_TOOL_IDS = new Set(toolCatalog.alwaysEnabledToolIds);

const PLAN_MODE_BLOCKED_TOOLS = new Set(environmentPolicy.readOnlyBlocked);

function getChatModeSuffix(chatMode) {
  if (!chatMode) return '';
  return environmentPolicy.chatModeSuffixes[chatMode] || '';
}

function isReadOnlyMode(chatMode) {
  return chatMode === 'plan';
}

const ACCEPT_EDITS_TOOLS = new Set(['edit', 'write']);
const ACCEPT_EDITS_BASH_COMMANDS = new Set(['mkdir', 'touch', 'mv', 'cp']);

function resolveToolApprovalMode(agentConfig) {
  const chatMode = agentConfig?.chatMode;
  if (chatMode === 'full-auto') return 'bypass';
  if (chatMode === 'auto-edit') return 'acceptEdits';
  return 'confirm';
}

function resolveBuiltinToolApproval(toolId, toolApprovalMode) {
  if (toolApprovalMode === 'bypass') return 'auto';
  if (toolApprovalMode === 'acceptEdits' && ACCEPT_EDITS_TOOLS.has(toolId)) return 'auto';
  if (DEFAULT_SAFE_TOOLS.has(toolId)) return 'auto';
  return 'prompt';
}

function getEnabledOpenAiToolDefinitions(agentConfig, context = 'local') {
  // map legacy capitalized ids onto the new lowercase contract
  const disabled = new Set(
    (agentConfig?.disabledToolIds || []).map(mapLegacyToolId),
  );
  const chatMode = agentConfig?.chatMode;
  const policy = environmentPolicy.contexts[context];
  if (!policy) throw new Error('未知运行环境: ' + context);
  if (agentConfig?.toolOverrides) {
    for (const id of policy.defaultDisabled) disabled.add(id);
    for (const [id, enabled] of Object.entries(agentConfig.toolOverrides)) {
      if (enabled === true) disabled.delete(id);
      if (enabled === false) disabled.add(id);
    }
  }
  for (const id of policy.blocked) disabled.add(id);
  if (isReadOnlyMode(chatMode)) {
    for (const id of PLAN_MODE_BLOCKED_TOOLS) disabled.add(id);
  }
  for (const id of ALWAYS_ENABLED_TOOL_IDS) disabled.delete(id);
  if (chatMode === 'full-auto') disabled.add('AskUserQuestion');

  const approvalMode = resolveToolApprovalMode(agentConfig);
  return CLAUDE_CODE_BUILTIN_TOOLS.filter((t) => !disabled.has(t.id)).map((tool) => ({
    type: 'function',
    function: {
      name: tool.id,
      description: tool.description,
      parameters: getOpenAiToolParameters(tool.id),
    },
    _approval: resolveBuiltinToolApproval(tool.id, approvalMode),
  }));
}

function shouldPromptForTool(toolName, toolApprovalMode, invocationArgs) {
  const name = mapLegacyToolId(toolName);
  if (toolApprovalMode === 'bypass') return false;
  if (DEFAULT_SAFE_TOOLS.has(name) || require('./knowledge/tools.cjs').TOOL_NAMES.has(name)) return false;
  if (name === 'Skills') {
    const action = invocationArgs?.action;
    return action === 'install' || action === 'remove';
  }
  if (name === 'McpManager') {
    const action = invocationArgs?.action;
    return action !== 'list' && action !== 'status' && action !== 'tools';
  }
  if (toolApprovalMode === 'acceptEdits') {
    if (ACCEPT_EDITS_TOOLS.has(name)) return false;
    if (name === 'bash') {
      const cmd = String(invocationArgs?.command || '').trim().split(/\s+/, 1)[0];
      if (ACCEPT_EDITS_BASH_COMMANDS.has(cmd)) return false;
    }
    return true;
  }
  if (['edit', 'write'].includes(name)) return true;
  if (name === 'bash') return true;
  if (['ssh_write', 'ssh_edit'].includes(name)) return true;
  if (name === 'ssh_cwd') return Boolean(invocationArgs?.path);
  if (name === 'ssh_hosts') {
    return invocationArgs?.action !== 'list';
  }
  return true;
}

module.exports = {
  CLAUDE_CODE_BUILTIN_TOOLS,
  TOOL_LABELS,
  LEGACY_TOOL_ID_MAP,
  mapLegacyToolId,
  getEnabledOpenAiToolDefinitions,
  shouldPromptForTool,
  resolveBuiltinToolApproval,
  getChatModeSuffix,
  isReadOnlyMode,
  resolveToolApprovalMode,
  HOST_ONLY_TOOL_IDS: environmentPolicy.contexts.local.blocked.filter((id) => id.startsWith("ssh_") && !["ssh_exec", "ssh_hosts"].includes(id)),
  HOST_FORCED_DISABLED_IDS: environmentPolicy.contexts.host.blocked,
  DEFAULT_SAFE_TOOLS,
};

