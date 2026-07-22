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

/** Cherry-aligned Claude Code builtins (excludes DF-only tools) */
const CHERRY_ALIGNED_TOOL_IDS = new Set([
  "Bash",
  "Edit",
  "Glob",
  "Grep",
  "MultiEdit",
  "NotebookEdit",
  "NotebookRead",
  "Read",
  "Task",
  "TodoWrite",
  "WebFetch",
  "WebSearch",
  "Write",
]);

/** @see cherry-studio/src/shared/ai/claudecode/builtinTools.ts + electron/agentBuiltinDefinitions.cjs */
export const CLAUDE_CODE_BUILTIN_TOOLS: AgentBuiltinTool[] = [
  builtinTool(
    "Bash",
    "Executes shell commands in your environment",
    "shell",
    true,
  ),
  builtinTool(
    "Edit",
    "Performs exact string replacements in files (use Read first; supports fuzzy matching)",
    "file",
    true,
  ),
  builtinTool(
    "Glob",
    "Finds files by glob pattern; returns absolute paths sorted by modification time (max 100)",
    "search",
    false,
  ),
  builtinTool(
    "Grep",
    "Searches file contents with regex; returns paths, line numbers, and matches (max 100)",
    "search",
    false,
  ),
  builtinTool(
    "MultiEdit",
    "Performs multiple edits on a single file atomically",
    "file",
    true,
  ),
  builtinTool("NotebookEdit", "Modifies Jupyter notebook cells", "file", true),
  builtinTool(
    "NotebookRead",
    "Reads and displays Jupyter notebook contents",
    "file",
    false,
  ),
  builtinTool(
    "Read",
    "Reads file contents with line numbers (default 2000 lines; binary files rejected)",
    "file",
    false,
  ),
  builtinTool(
    "Task",
    "Runs a sub-agent to handle complex, multi-step tasks",
    "orchestration",
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
    "Write",
    "Creates or overwrites files (prefer Edit for existing files; use Read first)",
    "file",
    true,
  ),
  builtinTool("Skill", "Loads full instructions for an enabled skill", "context", false),
  builtinTool(
    "Skills",
    "Lists, searches, installs, initializes, and registers agent skills",
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
  "Read",
  "Glob",
  "Grep",
  "NotebookRead",
  "Task",
  "TodoWrite",
  "Skill",
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

export function getEnabledBuiltinTools(
  disabledToolIds: string[],
  toolApprovalMode: "auto" | "confirm"
): AgentBuiltinTool[] {
  const disabled = new Set(disabledToolIds);
  return getBuiltinToolCatalog(toolApprovalMode).filter((t) => !disabled.has(t.id));
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
  if (!Array.isArray(value)) return stripAlwaysEnabledToolIds([...fallback]);
  const valid = new Set(CLAUDE_CODE_BUILTIN_TOOLS.map((t) => t.id));
  return stripAlwaysEnabledToolIds(
    value.filter((id): id is string => typeof id === "string" && valid.has(id)),
  );
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
    case "Read":
      return {
        type: "object",
        properties: {
          file_path: { type: "string", description: "The path to the file to read" },
          offset: { type: "number", description: "Line number to start from (1-based)" },
          limit: { type: "number", description: "Number of lines to read (default 2000)" },
        },
        required: ["file_path"],
      };
    case "Write":
      return {
        type: "object",
        properties: {
          file_path: { type: "string" },
          content: { type: "string" },
        },
        required: ["file_path", "content"],
      };
    case "Edit":
      return {
        type: "object",
        properties: {
          file_path: { type: "string" },
          old_string: { type: "string" },
          new_string: { type: "string" },
          replace_all: { type: "boolean" },
        },
        required: ["file_path", "old_string", "new_string"],
      };
    case "MultiEdit":
      return {
        type: "object",
        properties: {
          file_path: { type: "string" },
          edits: {
            type: "array",
            items: {
              type: "object",
              properties: {
                old_string: { type: "string" },
                new_string: { type: "string" },
                replace_all: { type: "boolean" },
              },
              required: ["old_string", "new_string"],
            },
          },
        },
        required: ["file_path", "edits"],
      };
    case "Bash":
      return {
        type: "object",
        properties: {
          command: { type: "string" },
          timeout: {
            type: "number",
            description:
              "Max runtime: values < 1000 = seconds, else milliseconds. Default 120000 (2 min), max 600000 (10 min).",
          },
          description: { type: "string" },
          run_in_background: { type: "boolean" },
        },
        required: ["command"],
      };
    case "Glob":
      return {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Glob pattern (e.g. **/*.ts)" },
          path: { type: "string", description: "Directory to search (defaults to home)" },
        },
        required: ["pattern"],
      };
    case "Grep":
      return {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Regex pattern to search for" },
          path: { type: "string", description: "Directory or file to search" },
          glob: { type: "string", description: 'File filter (e.g. "*.js")' },
          output_mode: {
            type: "string",
            enum: ["content", "files_with_matches", "count"],
          },
          "-i": { type: "boolean" },
          head_limit: { type: "number" },
        },
        required: ["pattern"],
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
    case "Task":
      return {
        type: "object",
        properties: {
          description: { type: "string" },
          prompt: { type: "string" },
          subagent_type: { type: "string" },
        },
        required: ["description", "prompt", "subagent_type"],
      };
    case "NotebookRead":
      return {
        type: "object",
        properties: {
          notebook_path: { type: "string" },
        },
        required: ["notebook_path"],
      };
    case "NotebookEdit":
      return {
        type: "object",
        properties: {
          notebook_path: { type: "string" },
          cell_id: { type: "string" },
          new_source: { type: "string" },
          cell_type: { type: "string", enum: ["code", "markdown"] },
          edit_mode: {
            type: "string",
            enum: ["replace", "insert", "delete"],
          },
        },
        required: ["notebook_path", "new_source"],
      };
    case "Skill":
      return {
        type: "object",
        properties: {
          skill: { type: "string" },
          args: { type: "string" },
        },
        required: ["skill"],
      };
    case "Skills":
      return {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "search", "install", "remove", "init", "register"] },
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
