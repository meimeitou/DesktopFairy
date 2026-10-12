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
