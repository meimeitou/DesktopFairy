/**
 * Builtin agent tool parameter schemas (model-facing).
 * Id, description, category, and default approval live in agentBuiltinCatalogData.json
 * so the renderer settings UI and this process share one catalog.
 */

const { tools } = require('./agentBuiltinCatalogData.json');

const CLAUDE_CODE_BUILTIN_TOOLS = tools.map((tool) => ({
  ...tool,
  name: tool.id,
}));

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
          url: { type: 'string', description: 'Single URL (legacy)' },
          urls: {
            type: 'array',
            items: { type: 'string' },
            description: 'One or more URLs to fetch',
          },
          prompt: { type: 'string', description: 'Optional focus hint' },
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
                status: {
                  type: 'string',
                  enum: ['pending', 'in_progress', 'completed'],
                },
                activeForm: { type: 'string' },
              },
              required: ['content', 'status', 'activeForm'],
            },
          },
        },
        required: ['todos'],
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
          host: { type: 'string', description: '列表中已保存 SSH 主机的完整名称；先按用户线索筛选并确认，不要直接传模糊描述。主机对话中可省略' },
          hostId: { type: 'string', description: 'ssh_hosts(list) 返回的真实主机 id；先结合用户线索筛选候选，推断目标须确认后使用，不得直接传用户提供的模糊 id。主机对话中可省略' },
          command: { type: 'string', description: '要在远程主机上执行的 shell 命令；需要提权时不要在命令中写 sudo，而是设置 sudo 参数' },
          sudo: { type: 'boolean', description: '整条 shell 命令以 root 执行，必须逐条确认，标准输入为 /dev/null。工具自动向用户询问密码或选择使用连接账号的已保存密码；不要自行询问密码或在工具参数中传入密码' },
          timeout: { type: 'number', description: '超时秒数，默认 30，最大 600' },
        },
        required: ['command'],
      };
    case 'ssh_read':
      return {
        type: 'object',
        properties: {
          path: { type: 'string', description: '远程文件路径（可相对当前 cwd）' },
          hostId: { type: 'string', description: '已确认目标在 ssh_hosts(list) 中的真实 id；用户的简称、部分 IP 或用途描述须先筛选并确认，不得直接作为 hostId。缺省为对话所属主机' },
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
          hostId: { type: 'string', description: '已确认目标在 ssh_hosts(list) 中的真实 id；用户的简称、部分 IP 或用途描述须先筛选并确认，不得直接作为 hostId。缺省为对话所属主机' },
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
          hostId: { type: 'string', description: '已确认目标在 ssh_hosts(list) 中的真实 id；用户的简称、部分 IP 或用途描述须先筛选并确认，不得直接作为 hostId。缺省为对话所属主机' },
        },
        required: ['pattern'],
      };
    case 'ssh_write':
      return {
        type: 'object',
        properties: {
          path: { type: 'string', description: '远程文件路径（可相对当前 cwd）' },
          content: { type: 'string', description: '文件完整内容' },
          hostId: { type: 'string', description: '已确认目标在 ssh_hosts(list) 中的真实 id；用户的简称、部分 IP 或用途描述须先筛选并确认，不得直接作为 hostId。缺省为对话所属主机' },
        },
        required: ['path', 'content'],
      };
    case 'ssh_edit':
      return {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'hashline patch 文本（[file#TAG] 头 + PUT/CUT 操作）' },
          hostId: { type: 'string', description: '已确认目标在 ssh_hosts(list) 中的真实 id；用户的简称、部分 IP 或用途描述须先筛选并确认，不得直接作为 hostId。缺省为对话所属主机' },
        },
        required: ['input'],
      };
    case 'ssh_cwd':
      return {
        type: 'object',
        properties: {
          path: { type: 'string', description: '要切换到的目录（缺省=查看当前 cwd）' },
          hostId: { type: 'string', description: '已确认目标在 ssh_hosts(list) 中的真实 id；用户的简称、部分 IP 或用途描述须先筛选并确认，不得直接作为 hostId。缺省为对话所属主机' },
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
  CLAUDE_CODE_BUILTIN_TOOLS,
  TOOL_LABELS,
  getOpenAiToolParameters,
};
