const TOOL_LABELS: Record<string, string> = {
  Bash: "执行命令",
  Read: "读取文件",
  Write: "写入文件",
  Edit: "编辑文件",
  MultiEdit: "批量编辑",
  Glob: "查找文件",
  Grep: "搜索内容",
  NotebookRead: "读取 Notebook",
  NotebookEdit: "编辑 Notebook",
  WebFetch: "获取网页",
  WebSearch: "网页搜索",
  Task: "子任务",
  TodoWrite: "任务列表",
  Skill: "加载技能",
  Skills: "管理技能",
  McpManager: "管理 MCP",
};

const TOOL_ICONS: Record<string, string> = {
  Bash: "⌘",
  Read: "📄",
  Write: "✎",
  Edit: "✎",
  MultiEdit: "✎",
  Glob: "🔍",
  Grep: "🔎",
  NotebookRead: "📓",
  NotebookEdit: "📓",
  WebFetch: "🌐",
  WebSearch: "🌐",
  Task: "🤖",
  TodoWrite: "☑",
  Skill: "🎯",
  Skills: "📚",
  McpManager: "🔌",
};

type ToolCategory = "shell" | "file" | "search" | "web" | "other";

function getToolCategory(name: string): ToolCategory {
  if (name === "Bash") return "shell";
  if (["Read", "Write", "Edit", "MultiEdit", "NotebookRead", "NotebookEdit"].includes(name)) {
    return "file";
  }
  if (["Glob", "Grep"].includes(name)) return "search";
  if (["WebFetch", "WebSearch"].includes(name)) return "web";
  return "other";
}

function basename(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || path;
}

function truncate(text: string, max = 120): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function unescapeJsonString(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
}

function extractJsonStringField(raw: string, field: string): string {
  const re = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`);
  const match = raw.match(re);
  if (!match) return "";
  return unescapeJsonString(match[1]);
}

function pickString(args: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function parseToolArguments(raw?: string): {
  args: Record<string, unknown>;
  raw: string;
} {
  const str = raw?.trim() || "";
  if (!str) return { args: {}, raw: str };

  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { args: parsed as Record<string, unknown>, raw: str };
    }
  } catch {
    /* partial JSON while streaming */
  }

  const args: Record<string, unknown> = {};
  for (const field of [
    "command",
    "cmd",
    "script",
    "path",
    "file_path",
    "filePath",
    "notebook_path",
    "pattern",
    "url",
    "query",
    "description",
    "prompt",
    "skill",
    "action",
    "identifier",
  ]) {
    const value = extractJsonStringField(str, field);
    if (value) args[field] = value;
  }

  return { args, raw: str };
}

export function getToolDisplayName(toolName: string): string {
  const raw = toolName?.trim() || "工具";
  if (TOOL_LABELS[raw]) return TOOL_LABELS[raw];

  if (raw.startsWith("mcp__")) {
    const body = raw.slice(5);
    const sep = body.lastIndexOf("__");
    if (sep > 0) {
      const server = body.slice(0, sep).replace(/-/g, " ");
      const tool = body.slice(sep + 2).replace(/_/g, " ");
      return `${server} · ${tool}`;
    }
  }

  const legacyMcpMatch = raw.match(/^mcp[_-](.+?)_(.+)$/i);
  if (legacyMcpMatch) {
    const server = legacyMcpMatch[1].replace(/[_-]/g, " ");
    const tool = legacyMcpMatch[2].replace(/[_-]/g, " ");
    return `${server} · ${tool}`;
  }

  return raw.replace(/_/g, " ");
}

export function getToolIcon(toolName: string): string {
  const raw = toolName?.trim() || "";
  if (TOOL_ICONS[raw]) return TOOL_ICONS[raw];
  const category = getToolCategory(raw);
  if (category === "shell") return "⌘";
  if (category === "file") return "📄";
  if (category === "search") return "🔍";
  if (category === "web") return "🌐";
  return "🛠";
}

export function formatToolSummary(toolName: string, argsJson?: string): string {
  const { args, raw } = parseToolArguments(argsJson);

  const path = pickString(args, ["path", "file_path", "filePath"]);
  const pattern = pickString(args, ["pattern"]);
  const command = pickString(args, ["command", "cmd", "script"]);
  const url = pickString(args, ["url"]);
  const query = pickString(args, ["query"]);
  const notebook = pickString(args, ["notebook_path", "path", "file_path"]);
  const description = pickString(args, ["description", "prompt"]);

  switch (toolName) {
    case "Bash":
      return command
        ? truncate(command, 160)
        : description
          ? truncate(description, 160)
          : raw && raw !== "{}"
            ? truncate(raw, 160)
            : "";
    case "Read":
    case "Write":
    case "Edit":
    case "MultiEdit":
      return path ? truncate(path, 160) : "";
    case "Glob":
      return pattern ? truncate(pattern, 120) : path ? truncate(path, 120) : "";
    case "Grep": {
      const grepPath = path;
      if (pattern && grepPath) return truncate(`${pattern} · ${basename(grepPath)}`, 160);
      return pattern ? truncate(pattern, 120) : grepPath ? truncate(grepPath, 160) : "";
    }
    case "NotebookRead":
    case "NotebookEdit":
      return notebook ? truncate(notebook, 160) : "";
    case "WebFetch":
      return url ? truncate(url, 160) : "";
    case "WebSearch":
      return query ? truncate(query, 120) : "";
    case "Task":
      return description ? truncate(description, 120) : "";
    case "TodoWrite":
      return "更新待办";
    case "Skill":
      return pickString(args, ["skill"]) || "";
    case "Skills":
      return pickString(args, ["action"]) || "";
    case "McpManager": {
      const act = pickString(args, ["action"]);
      const srv = pickString(args, ["serverId", "name"]);
      return srv ? truncate(`${act} · ${srv}`, 120) : act || "";
    }
    default: {
      for (const value of Object.values(args)) {
        if (typeof value === "string" && value.trim()) {
          return truncate(value, 160);
        }
      }
      return raw && raw !== "{}" ? truncate(raw, 160) : "";
    }
  }
}

export function formatToolResultPreview(preview?: string): string {
  if (!preview?.trim()) return "";
  const trimmed = preview.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") {
        if ("error" in parsed && parsed.error) {
          return truncate(String(parsed.error), 240);
        }
        if ("ok" in parsed && parsed.ok === false && parsed.error) {
          return truncate(String(parsed.error), 240);
        }
        if ("stdout" in parsed && typeof parsed.stdout === "string") {
          return truncate(parsed.stdout, 240);
        }
        if ("content" in parsed && typeof parsed.content === "string") {
          return truncate(parsed.content, 240);
        }
      }
    } catch {
      /* fall through */
    }
  }
  return truncate(trimmed, 240);
}
