const {
  CLAUDE_CODE_BUILTIN_TOOLS,
  TOOL_LABELS,
  getOpenAiToolParameters,
} = require('./agentBuiltinDefinitions.cjs');

/**
 * Legacy (Cherry-aligned capitalized) tool ids → pi-contract lowercase ids.
 * Applied when reading persisted user settings so saved tool toggles keep
 * working after the id migration. Mirrored in src/shared/agentBuiltinTools.ts.
 */
const LEGACY_TOOL_ID_MAP = {
  Read: 'read',
  Write: 'write',
  Edit: 'edit',
  MultiEdit: 'edit',
  Bash: 'bash',
  Glob: 'glob',
  Grep: 'grep',
};

function mapLegacyToolId(id) {
  return LEGACY_TOOL_ID_MAP[id] || id;
}

const DEFAULT_SAFE_TOOLS = new Set([
  'read',
  'glob',
  'grep',
  'TodoWrite',
  'UpdateProfile',
  'AskUserQuestion',
]);

/** Enabled by default; only chatMode rules (full-auto) may hide from the model. */
const ALWAYS_ENABLED_TOOL_IDS = new Set(['AskUserQuestion']);

const PLAN_MODE_BLOCKED_TOOLS = new Set([
  'write',
  'edit',
  'bash',
  'WebFetch',
  'WebSearch',
  'Terminal',
]);

const CHAT_MODE_SUFFIXES = {
  plan: '\n\n## 计划模式\n当前处于【计划模式】。你只能使用 read / glob / grep / TodoWrite / Skills / AskUserQuestion 等只读工具来理解现状并输出执行计划。严禁调用 write / edit / bash / WebFetch / WebSearch 等会改变系统或需要联网的工具。回答先给出目标与方案拆解，再列出要修改的文件和具体步骤，等待用户确认后再进入下一阶段。若目标或方案有歧义，可调用 AskUserQuestion 向用户确认。',
  'auto-edit': '\n\n## 自动编辑模式\n当前处于【自动编辑模式】。为了推进任务，你可以直接读写文件，无需再为 edit / write 等编辑类操作请求用户确认；但 bash / WebFetch / WebSearch / 网络请求或可能破坏环境的操作仍需先征得用户同意。若缺少关键偏好或实现方向不明确，可调用 AskUserQuestion 向用户确认。',
  'full-auto': '\n\n## 全自动模式\n当前处于【全自动模式】。为了高效推进任务，你可以自主决定使用任何已提供的工具，无需再向用户请求确认，包括文件编辑、bash 命令、网络请求等。全自动模式下不可向用户追问方向，请自行做出合理假设并继续；请保持操作的正确性与安全，在任务完成后再向用户汇报结果。',
};

function getChatModeSuffix(chatMode) {
  if (!chatMode) return '';
  return CHAT_MODE_SUFFIXES[chatMode] || '';
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
  const rawDisabled =
    context === 'local'
      ? agentConfig?.disabledToolIds || []
      : agentConfig?.terminalDisabledToolIds || [];
  // map legacy capitalized ids onto the new lowercase contract
  const disabled = new Set(rawDisabled.map(mapLegacyToolId));
  const chatMode = agentConfig?.chatMode;
  if (isReadOnlyMode(chatMode)) {
    for (const id of PLAN_MODE_BLOCKED_TOOLS) disabled.add(id);
  }

  for (const id of ALWAYS_ENABLED_TOOL_IDS) disabled.delete(id);
  if (chatMode === 'full-auto') {
    disabled.add('AskUserQuestion');
  }

  if (context === 'local') {
    disabled.add('Terminal');
  }

  if (context === 'terminal') {
    disabled.add('bash');
    if (
      !rawDisabled.includes('Terminal') &&
      agentConfig?.enableTerminalTool !== false
    ) {
      disabled.delete('Terminal');
    }
  }

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
  if (DEFAULT_SAFE_TOOLS.has(name)) return false;
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
  if (['WebFetch', 'WebSearch'].includes(name)) return true;
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
  getOpenAiToolParameters,
};
