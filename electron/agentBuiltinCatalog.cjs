const {
  CLAUDE_CODE_BUILTIN_TOOLS,
  TOOL_LABELS,
  getOpenAiToolParameters,
} = require('./agentBuiltinDefinitions.cjs');

/** @see cherry-studio/src/shared/ai/claudecode/toolRules.ts */
const DEFAULT_SAFE_TOOLS = new Set([
  'Read',
  'Glob',
  'Grep',
  'NotebookRead',
  'Task',
  'TodoWrite',
  'Skill',
  'UpdateProfile',
]);

const PLAN_MODE_BLOCKED_TOOLS = new Set([
  'Write',
  'Edit',
  'MultiEdit',
  'NotebookEdit',
  'Bash',
  'WebFetch',
  'WebSearch',
  'Terminal',
]);

const CHAT_MODE_SUFFIXES = {
  plan: '\n\n## 计划模式\n当前处于【计划模式】。你只能使用 Read / Glob / Grep / TodoWrite / Skill / Skills 等只读工具来理解现状并输出执行计划。严禁调用 Write / Edit / MultiEdit / NotebookEdit / Bash / WebFetch / WebSearch / Task 等会改变系统或需要联网的工具。回答先给出目标与方案拆解，再列出要修改的文件和具体步骤，等待用户确认后再进入下一阶段。',
  'auto-edit': '\n\n## 自动编辑模式\n当前处于【自动编辑模式】。为了推进任务，你可以直接读写文件，无需再为 Edit / Write / MultiEdit 等编辑类操作请求用户确认；但 Bash / WebFetch / WebSearch / 网络请求或可能破坏环境的操作仍需先征得用户同意。',
  'full-auto': '\n\n## 全自动模式\n当前处于【全自动模式】。为了高效推进任务，你可以自主决定使用任何已提供的工具，无需再向用户请求确认，包括文件编辑、Bash 命令、网络请求、子 Agent 调度等。请保持操作的正确性与安全，在任务完成后再向用户汇报结果。',
};

function getChatModeSuffix(chatMode) {
  if (!chatMode) return '';
  return CHAT_MODE_SUFFIXES[chatMode] || '';
}

function isReadOnlyMode(chatMode) {
  return chatMode === 'plan';
}

const ACCEPT_EDITS_TOOLS = new Set(['Edit', 'MultiEdit', 'NotebookEdit', 'Write']);
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
  const disabled = new Set(
    context === 'local'
      ? agentConfig?.disabledToolIds || []
      : agentConfig?.terminalDisabledToolIds || []
  );
  const chatMode = agentConfig?.chatMode;
  if (isReadOnlyMode(chatMode)) {
    for (const id of PLAN_MODE_BLOCKED_TOOLS) disabled.add(id);
  }

  if (context === 'local') {
    disabled.add('Terminal');
  }

  if (context === 'terminal') {
    disabled.add('Bash');
    if (
      !agentConfig?.terminalDisabledToolIds?.includes('Terminal') &&
      agentConfig?.enableTerminalTool !== false
    ) {
      disabled.delete('Terminal');
    }
  }

  const approvalMode = resolveToolApprovalMode(agentConfig);
  const enabledSkillIds = agentConfig?.enabledSkillIds || [];
  return CLAUDE_CODE_BUILTIN_TOOLS.filter((t) => {
    if (disabled.has(t.id)) return false;
    if (t.id === 'Skill' && enabledSkillIds.length === 0) return false;
    return true;
  }).map((tool) => ({
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
  if (toolApprovalMode === 'bypass') return false;
  if (DEFAULT_SAFE_TOOLS.has(toolName)) return false;
  if (toolName === 'Skills') {
    const action = invocationArgs?.action;
    return action === 'install' || action === 'remove';
  }
  if (toolName === 'McpManager') {
    const action = invocationArgs?.action;
    return action !== 'list' && action !== 'status' && action !== 'tools';
  }
  if (toolApprovalMode === 'acceptEdits') {
    if (ACCEPT_EDITS_TOOLS.has(toolName)) return false;
    if (toolName === 'Bash') {
      const cmd = String(invocationArgs?.command || '').trim().split(/\s+/, 1)[0];
      if (ACCEPT_EDITS_BASH_COMMANDS.has(cmd)) return false;
    }
    return true;
  }
  if (['Edit', 'MultiEdit', 'NotebookEdit', 'Write'].includes(toolName)) return true;
  if (toolName === 'Bash') return true;
  if (['WebFetch', 'WebSearch'].includes(toolName)) return true;
  return true;
}

module.exports = {
  CLAUDE_CODE_BUILTIN_TOOLS,
  TOOL_LABELS,
  getEnabledOpenAiToolDefinitions,
  shouldPromptForTool,
  resolveBuiltinToolApproval,
  getChatModeSuffix,
  isReadOnlyMode,
  resolveToolApprovalMode,
  getOpenAiToolParameters,
};
