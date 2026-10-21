const TOOL_LABELS: Record<string, string> = {
  bash: "执行命令",
  read: "读取文件",
  write: "写入文件",
  edit: "编辑文件",
  glob: "查找文件",
  grep: "搜索内容",
  WebFetch: "获取网页",
  WebSearch: "网页搜索",
  Task: "子任务",
  TodoWrite: "任务列表",
  Skill: "加载技能",
  Skills: "管理技能",
  McpManager: "管理 MCP",
  ssh_exec: "SSH 远程执行",
  ssh_hosts: "SSH 主机管理",
};

const TOOL_ICONS: Record<string, string> = {
  bash: "⌘",
  read: "📄",
  write: "✎",
  edit: "✎",
  glob: "🔍",
  grep: "🔎",
  WebFetch: "🌐",
  WebSearch: "🌐",
  Task: "🤖",
  TodoWrite: "☑",
  Skill: "🎯",
  Skills: "📚",
  ssh_exec: "⌘",
  ssh_hosts: "🖥",
};

type ToolCategory = "shell" | "file" | "search" | "web" | "other";

const LEGACY_TOOL_ID_MAP: Record<string, string> = {
  Read: "read",
  Write: "write",
  Edit: "edit",
  MultiEdit: "edit",
  Bash: "bash",
  Glob: "glob",
  Grep: "grep",
};

function normalizeToolName(name: string): string {
  return LEGACY_TOOL_ID_MAP[name] || name;
}

function getToolCategory(name: string): ToolCategory {
  const n = normalizeToolName(name);
  if (n === "bash") return "shell";
  if (["read", "write", "edit"].includes(n)) return "file";
  if (["glob", "grep"].includes(n)) return "search";
  if (["WebFetch", "WebSearch"].includes(n)) return "web";
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
    "input",
    "cwd",
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
  const normalized = normalizeToolName(raw);
  if (TOOL_LABELS[normalized]) return TOOL_LABELS[normalized];

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
  const description = pickString(args, ["description", "prompt"]);

  switch (normalizeToolName(toolName)) {
    case "bash":
      return command
        ? truncate(command, 160)
        : description
          ? truncate(description, 160)
          : raw && raw !== "{}"
            ? truncate(raw, 160)
            : "";
    case "edit": {
      const input = pickString(args, ["input"]);
      if (input) {
        const firstSection = input.split("\n").find((l) => l.trim().startsWith("["));
        return truncate(firstSection || input, 160);
      }
      return path ? truncate(path, 160) : "";
    }
    case "read":
    case "write":
      return path ? truncate(path, 160) : "";
    case "glob":
      return path ? truncate(path, 120) : "";
    case "grep": {
      const grepPath = path;
      if (pattern && grepPath) return truncate(`${pattern} · ${basename(grepPath)}`, 160);
      return pattern ? truncate(pattern, 120) : grepPath ? truncate(grepPath, 160) : "";
    }
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
    case "Skills": {
      const action = pickString(args, ["action"]);
      if (action === "load") return pickString(args, ["skill"]) || "load";
      return action || "";
    }
    case "AskUserQuestion": {
      const questions = Array.isArray(args.questions) ? args.questions : [];
      const first =
        questions[0] && typeof questions[0] === "object"
          ? String((questions[0] as { question?: string }).question || "").trim()
          : "";
      if (questions.length <= 1) return first ? truncate(first, 120) : "等待用户回答";
      return first
        ? truncate(`${first}（共 ${questions.length} 题）`, 120)
        : `${questions.length} 个问题`;
    }
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
