/** Cherry Studio claudeCodeBuiltinTools — main-process mirror of src/shared/agentBuiltinTools.ts */

const DEFAULT_SAFE_TOOLS = new Set([
  'Read',
  'Glob',
  'Grep',
  'NotebookRead',
  'Task',
  'TodoWrite',
  'Skill',
]);

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
];

const TOOL_LABELS = Object.fromEntries(
  CLAUDE_CODE_BUILTIN_TOOLS.map((t) => [t.id, t.name])
);

function resolveBuiltinToolApproval(toolId, toolApprovalMode) {
  if (toolApprovalMode === 'auto') return 'auto';
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
    default:
      return { type: 'object', properties: {}, required: [] };
  }
}

function getEnabledOpenAiToolDefinitions(agentConfig) {
  const disabled = new Set(agentConfig?.disabledToolIds || []);
  const approvalMode = agentConfig?.toolApprovalMode || 'confirm';
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
  if (toolApprovalMode === 'auto') return false;
  if (DEFAULT_SAFE_TOOLS.has(toolName)) return false;
  if (toolName === 'Skills') {
    const action = invocationArgs?.action;
    return action === 'install' || action === 'remove';
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
};
