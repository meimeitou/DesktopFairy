/** Cherry Studio claudeCodeBuiltinTools — main-process mirror of src/shared/agentBuiltinTools.ts */

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

const READ_ONLY_TOOLS = new Set([
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

const CLAUDE_CODE_BUILTIN_TOOLS = [
  { id: 'Bash', name: 'Bash', description: 'Executes shell commands in your environment', category: 'shell', defaultPrompt: true },
  { id: 'Edit', name: 'Edit', description: 'Makes targeted edits to specific files', category: 'file', defaultPrompt: true },
  { id: 'Glob', name: 'Glob', description: 'Finds files based on pattern matching', category: 'search', defaultPrompt: false },
  { id: 'Grep', name: 'Grep', description: 'Searches for patterns in file contents', category: 'search', defaultPrompt: false },
  { id: 'MultiEdit', name: 'MultiEdit', description: 'Performs multiple edits on a single file atomically', category: 'file', defaultPrompt: true },
  { id: 'NotebookEdit', name: 'NotebookEdit', description: 'Modifies Jupyter notebook cells', category: 'file', defaultPrompt: true },
  { id: 'NotebookRead', name: 'NotebookRead', description: 'Reads and displays Jupyter notebook contents', category: 'file', defaultPrompt: false },
  { id: 'Read', name: 'Read', description: 'Reads the contents of files', category: 'file', defaultPrompt: false },
  { id: 'Task', name: 'Task', description: 'Runs a sub-agent to handle complex, multi-step tasks', category: 'orchestration', defaultPrompt: false },
  { id: 'TodoWrite', name: 'TodoWrite', description: 'Creates and manages structured task lists', category: 'orchestration', defaultPrompt: false },
  { id: 'WebFetch', name: 'WebFetch', description: 'Fetches content from a specified URL', category: 'context', defaultPrompt: true },
  { id: 'WebSearch', name: 'WebSearch', description: 'Performs web searches with domain filtering', category: 'context', defaultPrompt: true },
  { id: 'Write', name: 'Write', description: 'Creates or overwrites files', category: 'file', defaultPrompt: true },
  { id: 'Skill', name: 'Skill', description: 'Loads full instructions for an enabled skill', category: 'context', defaultPrompt: false },
  { id: 'Skills', name: 'Skills', description: 'Lists, searches, installs, initializes, and registers agent skills', category: 'context', defaultPrompt: true },
  { id: 'UpdateProfile', name: 'UpdateProfile', description: "Updates the agent's SOUL.md or USER.md profile content (auto-approved)", category: 'context', defaultPrompt: false },
  { id: 'McpManager', name: 'McpManager', description: 'Lists, inspects, and manages MCP servers (enable/disable/restart/stop/add/edit/remove)', category: 'context', defaultPrompt: true },
  { id: 'Terminal', name: 'Terminal', description: 'Sends a shell command to the currently visible terminal session and returns its output', category: 'shell', defaultPrompt: true },
];

const TOOL_LABELS = Object.fromEntries(
  CLAUDE_CODE_BUILTIN_TOOLS.map((t) => [t.id, t.name])
);

function resolveBuiltinToolApproval(toolId, toolApprovalMode) {
  if (toolApprovalMode === 'bypass') return 'auto';
  if (toolApprovalMode === 'acceptEdits' && ACCEPT_EDITS_TOOLS.has(toolId)) return 'auto';
  if (DEFAULT_SAFE_TOOLS.has(toolId)) return 'auto';
  return 'prompt';
}

function getOpenAiToolParameters(toolId) {
  switch (toolId) {
    case 'Read':
      return {
        type: 'object',
        properties: {
          file_path: { type: 'string' },
          offset: { type: 'number' },
          limit: { type: 'number' },
        },
        required: ['file_path'],
      };
    case 'Write':
      return {
        type: 'object',
        properties: {
          file_path: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['file_path', 'content'],
      };
    case 'Edit':
      return {
        type: 'object',
        properties: {
          file_path: { type: 'string' },
          old_string: { type: 'string' },
          new_string: { type: 'string' },
          replace_all: { type: 'boolean' },
        },
        required: ['file_path', 'old_string', 'new_string'],
      };
    case 'MultiEdit':
      return {
        type: 'object',
        properties: {
          file_path: { type: 'string' },
          edits: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                old_string: { type: 'string' },
                new_string: { type: 'string' },
                replace_all: { type: 'boolean' },
              },
              required: ['old_string', 'new_string'],
            },
          },
        },
        required: ['file_path', 'edits'],
      };
    case 'Bash':
      return {
        type: 'object',
        properties: {
          command: { type: 'string' },
          timeout: { type: 'number' },
          description: { type: 'string' },
          run_in_background: { type: 'boolean' },
        },
        required: ['command'],
      };
    case 'Glob':
      return {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
          path: { type: 'string' },
        },
        required: ['pattern'],
      };
    case 'Grep':
      return {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
          path: { type: 'string' },
          glob: { type: 'string' },
          output_mode: { type: 'string', enum: ['content', 'files_with_matches', 'count'] },
          '-i': { type: 'boolean' },
          head_limit: { type: 'number' },
        },
        required: ['pattern'],
      };
    case 'WebSearch':
      return {
        type: 'object',
        properties: {
          query: { type: 'string' },
          allowed_domains: { type: 'array', items: { type: 'string' } },
          blocked_domains: { type: 'array', items: { type: 'string' } },
        },
        required: ['query'],
      };
    case 'WebFetch':
      return {
        type: 'object',
        properties: {
          url: { type: 'string' },
          prompt: { type: 'string' },
        },
        required: ['url', 'prompt'],
      };
    case 'TodoWrite':
      return {
        type: 'object',
        properties: {
          todos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                content: { type: 'string' },
                status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
                activeForm: { type: 'string' },
              },
              required: ['content', 'status', 'activeForm'],
            },
          },
        },
        required: ['todos'],
      };
    case 'Task':
      return {
        type: 'object',
        properties: {
          description: { type: 'string' },
          prompt: { type: 'string' },
          subagent_type: { type: 'string' },
        },
        required: ['description', 'prompt', 'subagent_type'],
      };
    case 'NotebookRead':
      return {
        type: 'object',
        properties: { notebook_path: { type: 'string' } },
        required: ['notebook_path'],
      };
    case 'NotebookEdit':
      return {
        type: 'object',
        properties: {
          notebook_path: { type: 'string' },
          cell_id: { type: 'string' },
          new_source: { type: 'string' },
          cell_type: { type: 'string', enum: ['code', 'markdown'] },
          edit_mode: { type: 'string', enum: ['replace', 'insert', 'delete'] },
        },
        required: ['notebook_path', 'new_source'],
      };
    case 'Skill':
      return {
        type: 'object',
        properties: {
          skill: { type: 'string' },
          args: { type: 'string' },
        },
        required: ['skill'],
      };
    case 'Skills':
      return {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'search', 'install', 'remove', 'init', 'register'] },
          query: { type: 'string' },
          identifier: { type: 'string' },
          name: { type: 'string' },
        },
        required: ['action'],
      };
    case 'UpdateProfile':
      return {
        type: 'object',
        properties: {
          field: { type: 'string', enum: ['soul', 'user'] },
          action: { type: 'string', enum: ['replace', 'append'] },
          content: { type: 'string' },
        },
        required: ['field', 'action', 'content'],
      };
    case 'McpManager':
      return {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'status', 'tools', 'enable', 'disable', 'restart', 'stop', 'add', 'edit', 'remove'],
          },
          serverId: { type: 'string' },
          name: { type: 'string' },
          server: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string', enum: ['stdio', 'sse', 'streamableHttp'] },
              description: { type: 'string' },
              reference: { type: 'string' },
              baseUrl: { type: 'string' },
              command: { type: 'string' },
              args: { type: 'array', items: { type: 'string' } },
              env: { type: 'object' },
              headers: { type: 'object' },
              isActive: { type: 'boolean' },
            },
          },
        },
        required: ['action'],
      };
    case 'Terminal':
      return {
        type: 'object',
        properties: {
          command: { type: 'string' },
          timeout: { type: 'number' },
        },
        required: ['command'],
      };
    default:
      return { type: 'object', properties: {}, required: [] };
  }
}

function getEnabledOpenAiToolDefinitions(agentConfig, context = 'local') {
  const disabled = new Set(
    context === 'local'
      ? agentConfig?.disabledToolIds || []
      : agentConfig?.terminalDisabledToolIds || []
  );
  const chatMode = agentConfig?.chatMode;
  if (isReadOnlyMode(chatMode)) {
    for (const id of READ_ONLY_TOOLS) disabled.add(id);
  }

  if (context === 'local') {
    disabled.add('Terminal');
  }

  if (context === 'terminal') {
    disabled.add('Bash');
    // Terminal must remain available in the terminal drawer, even in plan mode,
    // unless the user explicitly disabled it or the legacy flag is false.
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
};
