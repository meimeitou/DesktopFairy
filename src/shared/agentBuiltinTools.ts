/** Cherry Studio claudeCodeBuiltinTools — ported for DesktopFairy agent settings/runtime. */

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

/** @see cherry-studio/src/shared/ai/claudecode/builtinTools.ts */
export const CLAUDE_CODE_BUILTIN_TOOLS: AgentBuiltinTool[] = [
  builtinTool("Bash", "Executes shell commands in your environment", "shell", true),
  builtinTool("Edit", "Makes targeted edits to specific files", "file", true),
  builtinTool("Glob", "Finds files based on pattern matching", "search", false),
  builtinTool("Grep", "Searches for patterns in file contents", "search", false),
  builtinTool(
    "MultiEdit",
    "Performs multiple edits on a single file atomically",
    "file",
    true
  ),
  builtinTool("NotebookEdit", "Modifies Jupyter notebook cells", "file", true),
  builtinTool(
    "NotebookRead",
    "Reads and displays Jupyter notebook contents",
    "file",
    false
  ),
  builtinTool("Read", "Reads the contents of files", "file", false),
  builtinTool(
    "Task",
    "Runs a sub-agent to handle complex, multi-step tasks",
    "orchestration",
    false
  ),
  builtinTool(
    "TodoWrite",
    "Creates and manages structured task lists",
    "orchestration",
    false
  ),
  builtinTool("WebFetch", "Fetches content from a specified URL", "context", true),
  builtinTool(
    "WebSearch",
    "Performs web searches with domain filtering",
    "context",
    true
  ),
  builtinTool("Write", "Creates or overwrites files", "file", true),
  builtinTool("Skill", "Loads full instructions for an enabled skill", "context", false),
  builtinTool(
    "Skills",
    "Lists, searches, installs, initializes, and registers agent skills",
    "context",
    true
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
]);

const ACCEPT_EDITS_TOOLS = new Set(["Edit", "MultiEdit", "NotebookEdit", "Write"]);

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

export function normalizeDisabledToolIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const valid = new Set(CLAUDE_CODE_BUILTIN_TOOLS.map((t) => t.id));
  return value.filter((id): id is string => typeof id === "string" && valid.has(id));
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
          file_path: { type: "string" },
          offset: { type: "number" },
          limit: { type: "number" },
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
          timeout: { type: "number" },
          description: { type: "string" },
          run_in_background: { type: "boolean" },
        },
        required: ["command"],
      };
    case "Glob":
      return {
        type: "object",
        properties: {
          pattern: { type: "string" },
          path: { type: "string" },
        },
        required: ["pattern"],
      };
    case "Grep":
      return {
        type: "object",
        properties: {
          pattern: { type: "string" },
          path: { type: "string" },
          glob: { type: "string" },
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
          url: { type: "string" },
          prompt: { type: "string" },
        },
        required: ["url", "prompt"],
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
    default:
      return { type: "object", properties: {}, required: [] as string[] };
  }
}
