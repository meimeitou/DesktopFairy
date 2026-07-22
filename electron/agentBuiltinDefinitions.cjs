/**
 * Builtin agent tool metadata aligned with Cherry Studio / Claude Code builtins.
 * DF-specific tools (Skill, UpdateProfile, McpManager, Terminal) are appended separately.
 * @see cherry-studio/src/shared/ai/claudecode/builtinTools.ts
 * @see cherry-studio/src/main/ai/mcp/servers/filesystem/tools/
 */

const WEB_SEARCH_DESCRIPTION = `Search the web for current information, news, and real-time data.

Use this when:
- The user asks about recent events, current prices, or live data
- You need to verify facts you're uncertain about or that may have changed
- The user references something you don't have context on

Don't use for:
- Math, code reasoning, or things you can answer from your training
- Well-known facts unlikely to have changed

You may call this multiple times with different queries to broaden coverage.`;

const WEB_FETCH_DESCRIPTION = `Fetch the readable content from one or more known web page URLs.

Use this when:
- You already have specific URLs from the user, prior context, or WebSearch
- You need page content from an article, documentation page, or reference URL
- Search snippets are not enough and you need the source page text

Don't use this when you only have a topic or question; call WebSearch first.`;

/** Tools shared with Cherry Studio Claude Code builtins */
const CHERRY_ALIGNED_BUILTIN_TOOLS = [
  {
    id: 'Bash',
    name: 'Bash',
    description: 'Executes shell commands in your environment',
    category: 'shell',
    defaultPrompt: true,
  },
  {
    id: 'Edit',
    name: 'Edit',
    description: `Performs exact string replacements in files.

- You must use the Read tool at least once before editing
- Preserve exact indentation from read output (after the line number prefix)
- Never include line number prefixes in old_string or new_string
- ALWAYS prefer editing existing files over creating new ones
- The edit will FAIL if old_string is not found in the file
- The edit will FAIL if old_string appears multiple times (provide more context or use replace_all)
- Use replace_all to rename variables or replace all occurrences`,
    category: 'file',
    defaultPrompt: true,
  },
  {
    id: 'Glob',
    name: 'Glob',
    description: `Fast file pattern matching tool that works with any codebase size.

- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching absolute file paths sorted by modification time (newest first)
- Patterns without "/" (e.g., "*.txt") match files at ANY depth
- Results are limited to 100 files`,
    category: 'search',
    defaultPrompt: false,
  },
  {
    id: 'Grep',
    name: 'Grep',
    description: `Fast content search tool that works with any codebase size.

- Searches file contents using regular expressions
- Supports full regex syntax (e.g., "log.*Error", "function\\s+\\w+")
- Filter files by pattern with glob (e.g., "*.js", "*.{ts,tsx}")
- Returns absolute file paths and line numbers with matching content
- Results are limited to 100 matches
- Binary files and common directories (node_modules, .git, dist) are excluded`,
    category: 'search',
    defaultPrompt: false,
  },
  {
    id: 'MultiEdit',
    name: 'MultiEdit',
    description: 'Performs multiple edits on a single file atomically',
    category: 'file',
    defaultPrompt: true,
  },
  {
    id: 'NotebookEdit',
    name: 'NotebookEdit',
    description: 'Modifies Jupyter notebook cells',
    category: 'file',
    defaultPrompt: true,
  },
  {
    id: 'NotebookRead',
    name: 'NotebookRead',
    description: 'Reads and displays Jupyter notebook contents',
    category: 'file',
    defaultPrompt: false,
  },
  {
    id: 'Read',
    name: 'Read',
    description: `Reads a file from the local filesystem.

- By default, reads up to 2000 lines starting from the beginning
- You can optionally specify a line offset and limit for long files
- Any lines longer than 2000 characters will be truncated
- Results are returned with line numbers starting at 1
- Binary files are detected and rejected with an error`,
    category: 'file',
    defaultPrompt: false,
  },
  {
    id: 'Task',
    name: 'Task',
    description: 'Runs a sub-agent to handle complex, multi-step tasks',
    category: 'orchestration',
    defaultPrompt: false,
  },
  {
    id: 'TodoWrite',
    name: 'TodoWrite',
    description: 'Creates and manages structured task lists',
    category: 'orchestration',
    defaultPrompt: false,
  },
  {
    id: 'WebFetch',
    name: 'WebFetch',
    description: WEB_FETCH_DESCRIPTION,
    category: 'context',
    defaultPrompt: true,
  },
  {
    id: 'WebSearch',
    name: 'WebSearch',
    description: WEB_SEARCH_DESCRIPTION,
    category: 'context',
    defaultPrompt: true,
  },
  {
    id: 'Write',
    name: 'Write',
    description: `Writes a file to the local filesystem.

- This tool will overwrite the existing file if one exists at the path
- You MUST use the Read tool first to understand what you're overwriting
- ALWAYS prefer using the Edit tool for existing files
- NEVER proactively create documentation files unless explicitly requested
- Parent directories will be created automatically if they don't exist`,
    category: 'file',
    defaultPrompt: true,
  },
];

/** DesktopFairy-specific builtins (not in Cherry claudeCodeBuiltinTools) */
const DF_EXTRA_BUILTIN_TOOLS = [
  {
    id: 'Skill',
    name: 'Skill',
    description: 'Loads full instructions for an enabled skill',
    category: 'context',
    defaultPrompt: false,
  },
  {
    id: 'Skills',
    name: 'Skills',
    description: 'Lists, searches, installs, initializes, and registers agent skills',
    category: 'context',
    defaultPrompt: true,
  },
  {
    id: 'UpdateProfile',
    name: 'UpdateProfile',
    description: "Updates the agent's SOUL.md or USER.md profile content (auto-approved)",
    category: 'context',
    defaultPrompt: false,
  },
  {
    id: 'McpManager',
    name: 'McpManager',
    description:
      'Lists, inspects, and manages MCP servers (enable/disable/restart/stop/add/edit/remove)',
    category: 'context',
    defaultPrompt: true,
  },
  {
    id: 'Terminal',
    name: 'Terminal',
    description:
      'Sends a shell command to the currently visible terminal session and returns its output',
    category: 'shell',
    defaultPrompt: true,
  },
  {
    id: 'AskUserQuestion',
    name: 'AskUserQuestion',
    description: `Asks the user clarifying questions during execution and waits for their answers.

Use when:
- A key preference or constraint is missing and cannot be inferred from files, settings, or chat history
- The user's instruction has multiple valid interpretations that would significantly change what you do
- You are blocked and must choose a direction before continuing

Do NOT use when:
- You can resolve the question with Read / Grep / Glob / settings / prior messages
- You only want polite confirmation ("shall I continue?") — proceed or state your assumption instead
- The answer would not change your next action
- chatMode is full-auto (tool unavailable)

Format: 1–4 questions. Each needs \`question\` plus \`options\` (0–4 preset choices as \`{label, description?}\` or plain strings). The UI always provides an "Other" free-text choice — do not duplicate it in options. Prefer 2–4 concise options when offering alternatives.`,
    category: 'context',
    defaultPrompt: false,
  },
];

const CLAUDE_CODE_BUILTIN_TOOLS = [...CHERRY_ALIGNED_BUILTIN_TOOLS, ...DF_EXTRA_BUILTIN_TOOLS];

const TOOL_LABELS = Object.fromEntries(CLAUDE_CODE_BUILTIN_TOOLS.map((t) => [t.id, t.name]));

function getOpenAiToolParameters(toolId) {
  switch (toolId) {
    case 'Read':
      return {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'The path to the file to read' },
          offset: {
            type: 'number',
            description: 'The line number to start reading from (1-based)',
          },
          limit: {
            type: 'number',
            description: 'The number of lines to read (defaults to 2000)',
          },
        },
        required: ['file_path'],
      };
    case 'Write':
      return {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'The path to the file to write' },
          content: { type: 'string', description: 'The content to write to the file' },
        },
        required: ['file_path', 'content'],
      };
    case 'Edit':
      return {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'The path to the file to modify' },
          old_string: { type: 'string', description: 'The text to replace' },
          new_string: { type: 'string', description: 'The text to replace it with' },
          replace_all: {
            type: 'boolean',
            description: 'Replace all occurrences of old_string (default false)',
          },
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
          timeout: {
            type: 'number',
            description:
              'Optional max runtime. Values < 1000 are treated as seconds; larger values as milliseconds. Default 120000 (2 min), max 600000 (10 min).',
          },
          description: { type: 'string' },
          run_in_background: { type: 'boolean' },
        },
        required: ['command'],
      };
    case 'Glob':
      return {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'The glob pattern to match files against' },
          path: {
            type: 'string',
            description:
              'The directory to search in (absolute path). Defaults to the home directory',
          },
        },
        required: ['pattern'],
      };
    case 'Grep':
      return {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'The regex pattern to search for' },
          path: { type: 'string', description: 'Directory or file to search in' },
          glob: {
            type: 'string',
            description: 'File pattern to include (e.g. "*.js", "*.{ts,tsx}")',
          },
          output_mode: { type: 'string', enum: ['content', 'files_with_matches', 'count'] },
          '-i': { type: 'boolean', description: 'Case insensitive search' },
          head_limit: { type: 'number' },
        },
        required: ['pattern'],
      };
    case 'WebSearch':
      return {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Self-contained web search query. MUST NOT use pronouns or context-dependent references.',
          },
          allowed_domains: { type: 'array', items: { type: 'string' } },
          blocked_domains: { type: 'array', items: { type: 'string' } },
        },
        required: ['query'],
      };
    case 'WebFetch':
      return {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'A single URL to fetch (legacy)' },
          urls: {
            type: 'array',
            items: { type: 'string' },
            description: 'One or more absolute URLs to fetch (preferred)',
          },
          prompt: { type: 'string', description: 'Optional focus hint for the fetched content' },
        },
        required: [],
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
          action: {
            type: 'string',
            enum: ['list', 'search', 'install', 'remove', 'init', 'register'],
          },
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
            enum: [
              'list',
              'status',
              'tools',
              'enable',
              'disable',
              'restart',
              'stop',
              'add',
              'edit',
              'remove',
            ],
          },
          serverId: { type: 'string' },
          name: { type: 'string' },
          server: { type: 'object' },
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
    case 'AskUserQuestion':
      return {
        type: 'object',
        required: ['questions'],
        properties: {
          questions: {
            type: 'array',
            minItems: 1,
            maxItems: 4,
            description: 'Questions to ask the user (1–4)',
            items: {
              type: 'object',
              required: ['question'],
              properties: {
                question: {
                  type: 'string',
                  description: 'Complete question text shown to the user',
                },
                header: {
                  type: 'string',
                  description: 'Very short label for the question (max ~12 chars)',
                },
                multiSelect: {
                  type: 'boolean',
                  description: 'Allow selecting multiple options',
                },
                options: {
                  type: 'array',
                  minItems: 0,
                  maxItems: 4,
                  description:
                    'Preset choices (0–4). UI always adds "Other" for custom text. Prefer 2–4 concise labels.',
                  items: {
                    oneOf: [
                      { type: 'string', description: 'Short option label' },
                      {
                        type: 'object',
                        required: ['label'],
                        properties: {
                          label: {
                            type: 'string',
                            description: 'Short option label (1–5 words)',
                          },
                          description: {
                            type: 'string',
                            description: 'Explanation of what this option means',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      };
    default:
      return { type: 'object', properties: {}, required: [] };
  }
}

module.exports = {
  CHERRY_ALIGNED_BUILTIN_TOOLS,
  DF_EXTRA_BUILTIN_TOOLS,
  CLAUDE_CODE_BUILTIN_TOOLS,
  TOOL_LABELS,
  getOpenAiToolParameters,
};
