export type ToolApproval = "auto" | "prompt";
export type ToolOrigin = "builtin";

export interface AgentBuiltinTool {
  id: string;
  name: string;
  description: string;
  origin: ToolOrigin;
  approval: ToolApproval;
  category: "shell" | "file" | "search" | "orchestration" | "context";
}

function builtinTool(
  id: string,
  description: string,
  category: AgentBuiltinTool["category"],
  defaultPrompt: boolean
): AgentBuiltinTool {
  return {
    id,
    name: id,
    description,
    origin: "builtin",
    approval: defaultPrompt ? "prompt" : "auto",
    category,
  };
}

/** Core FS builtins follow the pi (oh-my-pi) contract: lowercase ids. */
const CHERRY_ALIGNED_TOOL_IDS = new Set([
  "bash",
  "edit",
  "glob",
  "grep",
  "read",
  "TodoWrite",
  "WebFetch",
  "WebSearch",
  "write",
]);

/** Legacy (capitalized) tool ids → pi-contract ids. Mirrors electron/agentBuiltinCatalog.cjs. */
export const LEGACY_TOOL_ID_MAP: Record<string, string> = {
  Read: "read",
  Write: "write",
  Edit: "edit",
  MultiEdit: "edit",
  Bash: "bash",
  Glob: "glob",
  Grep: "grep",
};

/** @see cherry-studio/src/shared/ai/claudecode/builtinTools.ts + electron/agentBuiltinDefinitions.cjs */
export const CLAUDE_CODE_BUILTIN_TOOLS: AgentBuiltinTool[] = [
  builtinTool(
    "bash",
    "Execute a shell command. `timeout` in seconds (default 300, 0 disables, max 3600). `cwd` must exist; a leading `cd <path> &&` is rewritten into cwd. stdout/stderr are merged; non-zero exit returns an error ending 'Command exited with code <n>'. Output is tail-capped at 50 KiB.",
    "shell",
    true,
  ),
  builtinTool(
    "edit",
    "Applies line-anchored patches to existing files. Input: one or more `[PATH#TAG]` sections; copy the tag from the latest read/grep/edit result. Ops (line numbers refer to the original tagged snapshot): `PUT N.=M:` replace lines N..M with `+TEXT` rows; `PUT N*:` replace the syntactic block starting on line N; `PUT <N:` / `PUT >N:` insert before/after line N; `PUT >$:` append at tail; `CUT N.=M` / `CUT N*` delete (optionally into register `@name`); `PUT ... @name` paste a named register (anonymous register = last CUT); `REM` delete the file; `MV DEST` rename after edits. Body rows are final content: `+TEXT`, `+` alone = blank, literal leading `-`/`+` as `+-`/`++`. Ranges inclusive, ordered, non-overlapping, and must be within lines you have read. Use write to create files.",
    "file",
    true,
  ),
  builtinTool(
    "glob",
    "Find paths by glob. `path` may be a glob, file, directory, or ';'-separated list (default '.'). `limit` default/max 200; results mtime-newest-first in a grouped tree. `hidden`/`gitignore` default true.",
    "search",
    false,
  ),
  builtinTool(
    "grep",
    "Regex content search. `path` may be a file, directory, glob-like path, or ';'-separated list (default '.'). `case` default true (case-sensitive); `gitignore` default true; `skip` = file-page offset. Output: `[PATH#TAG]` headers with `*LINE:match` and ` LINE:context` (1 before, 3 after). 20 files per page; 20 matches per file (200 for single-file).",
    "search",
    false,
  ),
  builtinTool(
    "read",
    "Read files and directories through one `path` string with optional trailing selectors: `:50` (from line 50), `:50-100` (inclusive range), `:50+20` (20 lines from 50), `:5-16,40-80` (multi-range), `:raw` (no line prefixes), `:50-100:raw`. Directories render a depth-2 tree. Default 300 lines; bounded ranges add 1 leading/3 trailing context lines. Out-of-range returns a hint, not an error. Output carries a `[path#TAG]` header — copy it into edit.",
    "file",
    false,
  ),
  builtinTool(
    "TodoWrite",
    "Creates and manages structured task lists",
    "orchestration",
    false,
  ),
  builtinTool(
    "WebFetch",
    "Fetches readable content from known web page URLs (call WebSearch first if needed)",
    "context",
    true,
  ),
  builtinTool(
    "WebSearch",
    "Searches the web for current information, news, and real-time data",
    "context",
    true,
  ),
  builtinTool(
    "write",
    "Create or overwrite a file with full replacement content. Pasted `[path#TAG]` headers and `LINE:` prefixes are stripped automatically. Returns a fresh `[path#TAG]` header for follow-up edit.",
    "file",
    true,
  ),
  builtinTool(
    "Skills",
    "Loads, lists, searches, installs, initializes, and registers agent skills (action=load for an enabled skill)",
    "context",
    true
  ),
  builtinTool(
    "UpdateProfile",
    "Updates the agent's SOUL.md or USER.md profile content (auto-approved)",
    "context",
    false
  ),
  builtinTool(
    "McpManager",
    "Lists, inspects, and manages MCP servers (enable/disable/restart/stop/add/edit/remove)",
    "context",
    true
  ),
  builtinTool(
    "Terminal",
    "Sends a shell command to the currently visible terminal session and returns its output",
    "shell",
    true
  ),
  builtinTool(
    "ssh_exec",
    "Runs a one-shot shell command on a saved SSH host and returns merged output plus exitCode, then disconnects. In host conversations, omit `host`/`hostId` to target the conversation host (runs in the conversation cwd when set); cross-host requires prior user approval. Outside host conversations, `host` is the saved host name (exact match; ambiguous names are rejected with candidates). `timeout` in seconds (default 30, max 600).",
    "shell",
    true,
  ),
  builtinTool(
    "ssh_hosts",
    'Manages saved SSH hosts. Actions: "list" (read-only), "add" (create a host), "update" (modify fields of an existing host by exact name), "delete" (remove a host by exact name). Credentials are never managed here — reference an existing credential by credentialId only; inline password/privateKeyPath fields are rejected. Write actions require user approval.',
    "shell",
    true,
  ),
  builtinTool(
    "ssh_read",
    "Reads a file from a saved SSH host over SFTP. Supports `:line`/`:start-end` selectors and hashline anchors like the local read tool; directories render a 2-level tree. `path` may be relative to the conversation cwd. `hostId` defaults to the conversation host; cross-host requires prior user approval.",
    "file",
    false,
  ),
  builtinTool(
    "ssh_glob",
    "Finds files on a saved SSH host by glob pattern (`*`, `**`, `?`, `[...]`, `{a,b}`) via SFTP, sorted by mtime, grouped by directory. `path` is the search root (defaults to the conversation cwd). Hidden files are skipped unless `hidden` is true; built-in exclusion set always applies — remote .gitignore is NOT parsed. `hostId` defaults to the conversation host; cross-host requires prior user approval.",
    "file",
    false,
  ),
  builtinTool(
    "ssh_grep",
    "Searches file CONTENTS on a saved SSH host with a JS regex via SFTP, output anchored with file:line. Contract matches the local grep tool (context lines, per-file caps, total cap, `skip` pagination, binary files skipped, max file size 4M). `path` is the search root (defaults to the conversation cwd); remote .gitignore is NOT parsed. Invalid regex fails with `Invalid regex: <pattern>`. `hostId` defaults to the conversation host; cross-host requires prior user approval.",
    "file",
    false,
  ),
  builtinTool(
    "ssh_write",
    "Writes a file on a saved SSH host over SFTP with atomic replace (tmp file + rename). Creates parent directories as needed. Read the file first (ssh_read) before overwriting. `path` may be relative to the conversation cwd. `hostId` defaults to the conversation host; cross-host requires prior user approval.",
    "file",
    true,
  ),
  builtinTool(
    "ssh_edit",
    "Applies a hashline patch to a file on a saved SSH host over SFTP. Same input format as the local edit tool: `[file#TAG]` header + PUT/CUT ops, plan-first (any section failing leaves the remote file untouched), stale tag rejected. `hostId` defaults to the conversation host; cross-host requires prior user approval.",
    "file",
    true,
  ),
  builtinTool(
    "ssh_cwd",
    "Shows or switches the persistent working directory for the conversation on a saved SSH host. Without `path`, returns the current cwd (or the login home default). With `path`, runs a remote `cd` — on success the cwd persists; on failure the error is returned and the cwd is unchanged (never silently falls back to home). `hostId` defaults to the conversation host; cross-host requires prior user approval.",
    "file",
    true,
  ),
  builtinTool(
    "AskUserQuestion",
    "Asks the user clarifying questions during execution and waits for their answers (unavailable in full-auto)",
    "context",
    false
  ),
];

const DEFAULT_SAFE_TOOLS = new Set([
  "read",
  "glob",
  "grep",
  "TodoWrite",
  "UpdateProfile",
  "AskUserQuestion",
]);

export function resolveBuiltinToolApproval(
  toolId: string,
  toolApprovalMode: "auto" | "confirm"
): ToolApproval {
  if (toolApprovalMode === "auto") return "auto";
  if (DEFAULT_SAFE_TOOLS.has(toolId)) return "auto";
  return "prompt";
}

export function getBuiltinToolCatalog(
  toolApprovalMode: "auto" | "confirm"
): AgentBuiltinTool[] {
  return CLAUDE_CODE_BUILTIN_TOOLS.map((tool) => ({
    ...tool,
    approval: resolveBuiltinToolApproval(tool.id, toolApprovalMode),
  }));
}


/** Builtin tools that stay enabled unless mode rules block them (e.g. full-auto). */
export const ALWAYS_ENABLED_TOOL_IDS = ["AskUserQuestion"] as const;

export function stripAlwaysEnabledToolIds(disabledToolIds: string[]): string[] {
  const locked = new Set<string>(ALWAYS_ENABLED_TOOL_IDS);
  return disabledToolIds.filter((id) => !locked.has(id));
}

export function normalizeDisabledToolIds(
  value: unknown,
  fallback: string[] = [],
): string[] {
  const valid = new Set(CLAUDE_CODE_BUILTIN_TOOLS.map((t) => t.id));
  const normalize = (id: string): string => LEGACY_TOOL_ID_MAP[id] || id;
  if (!Array.isArray(value)) return stripAlwaysEnabledToolIds([...fallback]);
  const seen = new Set<string>();
  const mapped: string[] = [];
  for (const id of value) {
    if (typeof id !== "string") continue;
    const n = normalize(id);
    if (valid.has(n) && !seen.has(n)) {
      seen.add(n);
      mapped.push(n);
    }
  }
  return stripAlwaysEnabledToolIds(mapped);
}

export function isCherryAlignedBuiltinTool(toolId: string): boolean {
  return CHERRY_ALIGNED_TOOL_IDS.has(toolId);
}

export function buildOpenAiToolDefinitions(tools: AgentBuiltinTool[]) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.id,
      description: tool.description,
      parameters: getOpenAiToolParameters(tool.id),
    },
  }));
}

function getOpenAiToolParameters(toolId: string) {
  switch (toolId) {
    case "read":
      return {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "File or directory path, optionally with trailing line selectors: :50, :50-100, :50+20, :5-16,40-80, :raw, :50-100:raw",
          },
        },
        required: ["path"],
      };
    case "write":
      return {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      };
    case "edit":
      return {
        type: "object",
        properties: {
          input: {
            type: "string",
            description: "One or more [PATH#TAG] hashline patch sections",
          },
        },
        required: ["input"],
      };
    case "bash":
      return {
        type: "object",
        properties: {
          command: { type: "string" },
          timeout: {
            type: "number",
            description: "Seconds. Default 300; 0 disables; clamped 1..3600",
          },
          cwd: {
            type: "string",
            description:
              "Working directory (must exist). Leading 'cd <path> &&' is rewritten into cwd",
          },
          env: {
            type: "object",
            additionalProperties: { type: "string" },
          },
        },
        required: ["command"],
      };
    case "grep":
      return {
        type: "object",
        properties: {
          pattern: { type: "string" },
          path: {
            type: "string",
            description:
              "File, directory, glob-like path, or ';'-separated list. Default '.'",
          },
          case: { type: "boolean", description: "Case-sensitive (default true)" },
          gitignore: { type: "boolean", description: "Respect .gitignore (default true)" },
          skip: {
            type: "number",
            description: "File-page offset for multi-file results",
          },
        },
        required: ["pattern"],
      };
    case "glob":
      return {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Glob, file, directory, or ';'-separated list. Default '.'",
          },
          hidden: { type: "boolean" },
          gitignore: { type: "boolean" },
          limit: { type: "number", description: "Max paths (default/max 200)" },
        },
      };
    case "WebSearch":
      return {
        type: "object",
        properties: {
          query: { type: "string" },
          allowed_domains: { type: "array", items: { type: "string" } },
          blocked_domains: { type: "array", items: { type: "string" } },
        },
        required: ["query"],
      };
    case "WebFetch":
      return {
        type: "object",
        properties: {
          url: { type: "string", description: "Single URL (legacy)" },
          urls: {
            type: "array",
            items: { type: "string" },
            description: "One or more URLs to fetch",
          },
          prompt: { type: "string", description: "Optional focus hint" },
        },
        required: [],
      };
    case "TodoWrite":
      return {
        type: "object",
        properties: {
          todos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                content: { type: "string" },
                status: {
                  type: "string",
                  enum: ["pending", "in_progress", "completed"],
                },
                activeForm: { type: "string" },
              },
              required: ["content", "status", "activeForm"],
            },
          },
        },
        required: ["todos"],
      };
    case "Skills":
      return {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["load", "list", "search", "install", "remove", "init", "register"],
          },
          skill: { type: "string", description: "Skill id for action=load" },
          args: { type: "string", description: "Optional invocation context for action=load" },
          query: { type: "string" },
          identifier: { type: "string" },
          name: { type: "string" },
        },
        required: ["action"],
      };
    case "UpdateProfile":
      return {
        type: "object",
        properties: {
          field: { type: "string", enum: ["soul", "user"] },
          action: { type: "string", enum: ["replace", "append"] },
          content: { type: "string" },
        },
        required: ["field", "action", "content"],
      };
    case "McpManager":
      return {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: [
              "list",
              "status",
              "tools",
              "enable",
              "disable",
              "restart",
              "stop",
              "add",
              "edit",
              "remove",
            ],
          },
          serverId: { type: "string" },
          name: { type: "string" },
          server: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              type: { type: "string", enum: ["stdio", "sse", "streamableHttp"] },
              description: { type: "string" },
              reference: { type: "string" },
              baseUrl: { type: "string" },
              command: { type: "string" },
              args: { type: "array", items: { type: "string" } },
              env: { type: "object" },
              headers: { type: "object" },
              isActive: { type: "boolean" },
            },
          },
        },
        required: ["action"],
      };
    case "Terminal":
      return {
        type: "object",
        properties: {
          command: { type: "string" },
          timeout: { type: "number" },
        },
        required: ["command"],
      };
    case "ssh_exec":
      return {
        type: "object",
        properties: {
          host: { type: "string", description: "已保存 SSH 主机的名称（精确匹配；主机对话中可省略）" },
          hostId: { type: "string", description: "目标主机 id（主机对话中缺省为对话所属主机）" },
          command: { type: "string", description: "要在远程主机上执行的 shell 命令" },
          timeout: { type: "number", description: "超时秒数，默认 30，最大 600" },
        },
        required: ["command"],
      };
    case "ssh_read":
      return {
        type: "object",
        properties: {
          path: { type: "string", description: "远程文件路径（可相对当前 cwd）" },
          hostId: { type: "string", description: "目标主机 id（缺省为对话所属主机）" },
        },
        required: ["path"],
      };
    case "ssh_glob":
      return {
        type: "object",
        properties: {
          path: { type: "string", description: "搜索根目录（缺省为当前 cwd）" },
          hidden: { type: "boolean", description: "是否包含点文件（默认 false）" },
          gitignore: { type: "boolean", description: "兼容参数：远端不解析 .gitignore，仅应用内置排除集" },
          limit: { type: "number", description: "最大返回条数" },
          hostId: { type: "string", description: "目标主机 id（缺省为对话所属主机）" },
        },
      };
    case "ssh_grep":
      return {
        type: "object",
        properties: {
          pattern: { type: "string", description: "JS 正则表达式" },
          path: { type: "string", description: "搜索根目录（缺省为当前 cwd）" },
          case: { type: "boolean", description: "是否区分大小写（默认 true）" },
          gitignore: { type: "boolean", description: "兼容参数：远端不解析 .gitignore，仅应用内置排除集" },
          skip: { type: "number", description: "跳过前 N 条匹配，用于分页" },
          hostId: { type: "string", description: "目标主机 id（缺省为对话所属主机）" },
        },
        required: ["pattern"],
      };
    case "ssh_write":
      return {
        type: "object",
        properties: {
          path: { type: "string", description: "远程文件路径（可相对当前 cwd）" },
          content: { type: "string", description: "文件完整内容" },
          hostId: { type: "string", description: "目标主机 id（缺省为对话所属主机）" },
        },
        required: ["path", "content"],
      };
    case "ssh_edit":
      return {
        type: "object",
        properties: {
          input: { type: "string", description: "hashline patch 文本（[file#TAG] 头 + PUT/CUT 操作）" },
          hostId: { type: "string", description: "目标主机 id（缺省为对话所属主机）" },
        },
        required: ["input"],
      };
    case "ssh_cwd":
      return {
        type: "object",
        properties: {
          path: { type: "string", description: "要切换到的目录（缺省=查看当前 cwd）" },
          hostId: { type: "string", description: "目标主机 id（缺省为对话所属主机）" },
        },
      };
    case "ssh_hosts":
      return {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "add", "update", "delete"] },
          host: {
            type: "string",
            description: "目标主机条目的 name 字段（update/delete 用，精确匹配）",
          },
          fields: {
            type: "object",
            description:
              "add 的完整字段 / update 的部分字段。可用：name, host, port, user, authMethod(auto|password|privateKey), credentialId, group, proxyJump, proxyJumpAuthMethod, proxyJumpCredentialId。禁止 password/privateKeyPath 等内联凭据字段。",
          },
        },
        required: ["action"],
      };
    case "AskUserQuestion":
      return {
        type: "object",
        required: ["questions"],
        properties: {
          questions: {
            type: "array",
            minItems: 1,
            maxItems: 4,
            description: "Questions to ask the user (1–4)",
            items: {
              type: "object",
              required: ["question"],
              properties: {
                question: {
                  type: "string",
                  description: "Complete question text shown to the user",
                },
                header: {
                  type: "string",
                  description: "Very short label for the question (max ~12 chars)",
                },
                multiSelect: {
                  type: "boolean",
                  description: "Allow selecting multiple options",
                },
                options: {
                  type: "array",
                  minItems: 0,
                  maxItems: 4,
                  description:
                    'Preset choices (0–4). UI always adds "Other" for custom text. Prefer 2–4 concise labels.',
                  items: {
                    oneOf: [
                      { type: "string", description: "Short option label" },
                      {
                        type: "object",
                        required: ["label"],
                        properties: {
                          label: {
                            type: "string",
                            description: "Short option label (1–5 words)",
                          },
                          description: {
                            type: "string",
                            description: "Explanation of what this option means",
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
      return { type: "object", properties: {}, required: [] as string[] };
  }
}
