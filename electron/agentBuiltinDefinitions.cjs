/**
 * Builtin agent tool metadata aligned with Cherry Studio / Claude Code builtins.
 * DF-specific tools (Skills, UpdateProfile, McpManager, Terminal) are appended separately.
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

/** Core FS tools follow the pi (oh-my-pi) agent contract: lowercase ids,
 *  pi parameter schemas, pi semantics. */
const CHERRY_ALIGNED_BUILTIN_TOOLS = [
  {
    id: 'bash',
    name: 'bash',
    description: 'Execute a shell command. `timeout` in seconds (default 300, 0 disables, max 3600). `cwd` must exist; a leading `cd <path> &&` is rewritten into cwd. stdout/stderr are merged; non-zero exit returns an error ending \'Command exited with code <n>\'. Output is tail-capped at 50 KiB.',
    category: 'shell',
    defaultPrompt: true,
  },
  {
    id: 'edit',
    name: 'edit',
    description: 'Applies line-anchored patches to existing files. Input: one or more `[PATH#TAG]` sections; copy the tag from the latest read/grep/edit result. Ops (line numbers refer to the original tagged snapshot): `PUT N.=M:` replace lines N..M with `+TEXT` rows; `PUT N*:` replace the syntactic block starting on line N; `PUT <N:` / `PUT >N:` insert before/after line N; `PUT >$:` append at tail; `CUT N.=M` / `CUT N*` delete (optionally into register `@name`); `PUT ... @name` paste a named register (anonymous register = last CUT); `REM` delete the file; `MV DEST` rename after edits. Body rows are final content: `+TEXT`, `+` alone = blank, literal leading `-`/`+` as `+-`/`++`. Ranges inclusive, ordered, non-overlapping, and must be within lines you have read. Use write to create files.',
    category: 'file',
    defaultPrompt: true,
  },
  {
    id: 'glob',
    name: 'glob',
    description: 'Find paths by glob. `path` may be a glob, file, directory, or \';\'-separated list (default \'.\'). `limit` default/max 200; results mtime-newest-first in a grouped tree. `hidden`/`gitignore` default true.',
    category: 'search',
    defaultPrompt: false,
  },
  {
    id: 'grep',
    name: 'grep',
    description: 'Regex content search. `path` may be a file, directory, glob-like path, or \';\'-separated list (default \'.\'). `case` default true (case-sensitive); `gitignore` default true; `skip` = file-page offset. Output: `[PATH#TAG]` headers with `*LINE:match` and ` LINE:context` (1 before, 3 after). 20 files per page; 20 matches per file (200 for single-file).',
    category: 'search',
    defaultPrompt: false,
  },
  {
    id: 'read',
    name: 'read',
    description: 'Read files and directories through one `path` string with optional trailing selectors: `:50` (from line 50), `:50-100` (inclusive range), `:50+20` (20 lines from 50), `:5-16,40-80` (multi-range), `:raw` (no line prefixes), `:50-100:raw`. Directories render a depth-2 tree. Default 300 lines; bounded ranges add 1 leading/3 trailing context lines. Out-of-range returns a hint, not an error. Output carries a `[path#TAG]` header — copy it into edit.',
    category: 'file',
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
    id: 'write',
    name: 'write',
    description: 'Create or overwrite a file with full replacement content. Pasted `[path#TAG]` headers and `LINE:` prefixes are stripped automatically. Returns a fresh `[path#TAG]` header for follow-up edit.',
    category: 'file',
    defaultPrompt: true,
  },
];

/** DesktopFairy-specific builtins (not in Cherry claudeCodeBuiltinTools) */
const DF_EXTRA_BUILTIN_TOOLS = [
  {
    id: 'Skills',
    name: 'Skills',
    description:
      'Loads, lists, searches, installs, initializes, and registers agent skills. action=load only works for skills enabled in Settings or invoked this turn via /skill-id. Newly installed skills are not auto-enabled.',
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
    id: 'ssh_exec',
    name: 'ssh_exec',
    description:
      'Runs a one-shot shell command on a saved SSH host and returns stdout/stderr (merged) plus exitCode, then disconnects. In host conversations, omit `host`/`hostId` to target the conversation host (runs in the conversation cwd when set); cross-host requires prior user approval. Outside host conversations, `host` is the saved host name (exact match; ambiguous names are rejected with candidates). `timeout` in seconds (default 30, max 600). Not a terminal session — no interactivity.',
    category: 'shell',
  },
  {
    id: 'ssh_hosts',
    name: 'ssh_hosts',
    description:
      'Manages saved SSH hosts. Actions: "list" (read-only), "add" (create a host), "update" (modify fields of an existing host by exact name), "delete" (remove a host by exact name). Credentials are never managed here — reference an existing credential by credentialId only; inline password/privateKeyPath fields are rejected. Write actions require user approval.',
    category: 'shell',
  },
  {
    id: 'ssh_read',
    name: 'ssh_read',
    description:
      'Reads a file from a saved SSH host over SFTP. Supports `:line`/`:start-end` selectors and hashline anchors like the local read tool; directories render a 2-level tree. `path` may be relative to the conversation cwd. `hostId` defaults to the conversation host; cross-host requires prior user approval.',
    category: 'file',
  },
  {
    id: 'ssh_glob',
    name: 'ssh_glob',
    description:
      'Finds files on a saved SSH host by glob pattern (`*`, `**`, `?`, `[...]`, `{a,b}`) via SFTP, sorted by mtime, grouped by directory. `path` is the search root (defaults to the conversation cwd). Hidden files are skipped unless `hidden` is true; built-in exclusion set (node_modules, .git, etc.) always applies — remote .gitignore is NOT parsed. `hostId` defaults to the conversation host; cross-host requires prior user approval.',
    category: 'file',
  },
  {
    id: 'ssh_grep',
    name: 'ssh_grep',
    description:
      'Searches file CONTENTS on a saved SSH host with a JS regex via SFTP, output anchored with file:line. Contract matches the local grep tool (context lines, per-file caps, total cap, `skip` pagination, binary files skipped, max file size 4M). `path` is the search root (defaults to the conversation cwd); remote .gitignore is NOT parsed. Invalid regex fails with `Invalid regex: <pattern>`. `hostId` defaults to the conversation host; cross-host requires prior user approval.',
    category: 'file',
  },
  {
    id: 'ssh_write',
    name: 'ssh_write',
    description:
      'Writes a file on a saved SSH host over SFTP with atomic replace (tmp file + rename). Creates parent directories as needed. Read the file first (ssh_read) before overwriting. `path` may be relative to the conversation cwd. `hostId` defaults to the conversation host; cross-host requires prior user approval.',
    category: 'file',
  },
  {
    id: 'ssh_edit',
    name: 'ssh_edit',
    description:
      'Applies a hashline patch to a file on a saved SSH host over SFTP. Same input format as the local edit tool: `[file#TAG]` header + PUT/CUT ops, plan-first (any section failing leaves the remote file untouched), stale tag rejected. `hostId` defaults to the conversation host; cross-host requires prior user approval.',
    category: 'file',
  },
  {
    id: 'ssh_cwd',
    name: 'ssh_cwd',
    description:
      'Shows or switches the persistent working directory for the conversation on a saved SSH host. Without `path`, returns the current cwd (or the login home default). With `path`, runs a remote `cd` — on success the cwd persists for subsequent tools in this conversation; on failure the error is returned and the cwd is unchanged (never silently falls back to home). `hostId` defaults to the conversation host; cross-host requires prior user approval.',
    category: 'file',
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
    case 'read':
      return {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'File or directory path, optionally with trailing line selectors: :50, :50-100, :50+20, :5-16,40-80, :raw, :50-100:raw',
          },
        },
        required: ['path'],
      };
    case 'write':
      return {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['path', 'content'],
      };
    case 'edit':
      return {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: 'One or more [PATH#TAG] hashline patch sections',
          },
        },
        required: ['input'],
      };
    case 'bash':
      return {
        type: 'object',
        properties: {
          command: { type: 'string' },
          timeout: {
            type: 'number',
            description: 'Seconds. Default 300; 0 disables; clamped 1..3600',
          },
          cwd: {
            type: 'string',
            description:
              'Working directory (must exist). Leading \'cd <path> &&\' is rewritten into cwd',
          },
          env: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
        },
        required: ['command'],
      };
    case 'grep':
      return {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
          path: {
            type: 'string',
            description:
              'File, directory, glob-like path, or \';\'-separated list. Default \'.\'',
          },
          case: { type: 'boolean', description: 'Case-sensitive (default true)' },
          gitignore: { type: 'boolean', description: 'Respect .gitignore (default true)' },
          skip: {
            type: 'number',
            description: 'File-page offset for multi-file results',
          },
        },
        required: ['pattern'],
      };
    case 'glob':
      return {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Glob, file, directory, or \';\'-separated list. Default \'.\'',
          },
          hidden: { type: 'boolean' },
          gitignore: { type: 'boolean' },
          limit: { type: 'number', description: 'Max paths (default/max 200)' },
        },
      };
    case 'Skills':
      return {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['load', 'list', 'search', 'install', 'remove', 'init', 'register'],
          },
          skill: { type: 'string', description: 'Skill id for action=load' },
          args: {
            type: 'string',
            description: 'Optional invocation context for action=load',
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
    case 'ssh_exec':
      return {
        type: 'object',
        properties: {
          host: { type: 'string', description: '已保存 SSH 主机的名称（精确匹配；主机对话中可省略）' },
          hostId: { type: 'string', description: '目标主机 id（主机对话中缺省为对话所属主机）' },
          command: { type: 'string', description: '要在远程主机上执行的 shell 命令' },
          timeout: { type: 'number', description: '超时秒数，默认 30，最大 600' },
        },
        required: ['command'],
      };
    case 'ssh_read':
      return {
        type: 'object',
        properties: {
          path: { type: 'string', description: '远程文件路径（可相对当前 cwd）' },
          hostId: { type: 'string', description: '目标主机 id（缺省为对话所属主机）' },
        },
        required: ['path'],
      };
    case 'ssh_glob':
      return {
        type: 'object',
        properties: {
          path: { type: 'string', description: '搜索根目录（缺省为当前 cwd）' },
          hidden: { type: 'boolean', description: '是否包含点文件（默认 false）' },
          gitignore: { type: 'boolean', description: '兼容参数：远端不解析 .gitignore，仅应用内置排除集' },
          limit: { type: 'number', description: '最大返回条数' },
          hostId: { type: 'string', description: '目标主机 id（缺省为对话所属主机）' },
        },
      };
    case 'ssh_grep':
      return {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'JS 正则表达式' },
          path: { type: 'string', description: '搜索根目录（缺省为当前 cwd）' },
          case: { type: 'boolean', description: '是否区分大小写（默认 true）' },
          gitignore: { type: 'boolean', description: '兼容参数：远端不解析 .gitignore，仅应用内置排除集' },
          skip: { type: 'number', description: '跳过前 N 条匹配，用于分页' },
          hostId: { type: 'string', description: '目标主机 id（缺省为对话所属主机）' },
        },
        required: ['pattern'],
      };
    case 'ssh_write':
      return {
        type: 'object',
        properties: {
          path: { type: 'string', description: '远程文件路径（可相对当前 cwd）' },
          content: { type: 'string', description: '文件完整内容' },
          hostId: { type: 'string', description: '目标主机 id（缺省为对话所属主机）' },
        },
        required: ['path', 'content'],
      };
    case 'ssh_edit':
      return {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'hashline patch 文本（[file#TAG] 头 + PUT/CUT 操作）' },
          hostId: { type: 'string', description: '目标主机 id（缺省为对话所属主机）' },
        },
        required: ['input'],
      };
    case 'ssh_cwd':
      return {
        type: 'object',
        properties: {
          path: { type: 'string', description: '要切换到的目录（缺省=查看当前 cwd）' },
          hostId: { type: 'string', description: '目标主机 id（缺省为对话所属主机）' },
        },
      };
    case 'ssh_hosts':
      return {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'add', 'update', 'delete'] },
          host: {
            type: 'string',
            description: '目标主机条目的 name 字段（update/delete 用，精确匹配）',
          },
          fields: {
            type: 'object',
            description:
              'add 的完整字段 / update 的部分字段。可用：name, host, port, user, authMethod(auto|password|privateKey), credentialId, group, proxyJump, proxyJumpAuthMethod, proxyJumpCredentialId。禁止 password/privateKeyPath 等内联凭据字段。',
          },
        },
        required: ['action'],
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
