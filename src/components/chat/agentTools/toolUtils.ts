import {
  formatToolSummary,
  parseToolArguments,
} from "../../../shared/toolCallDisplay";

const MAX_CACHE = 256;
const argsCache = new Map<string, Record<string, unknown>>();
const outputCache = new Map<string, unknown>();

function remember<T>(cache: Map<string, T>, key: string, value: T): T {
  cache.set(key, value);
  if (cache.size > MAX_CACHE) {
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  return value;
}

export function getToolInput(
  toolName: string,
  argsJson?: string,
): Record<string, unknown> {
  const key = argsJson ?? "";
  const hit = argsCache.get(key);
  if (hit) return hit;
  return remember(argsCache, key, parseToolArguments(argsJson).args);
}

export function getToolCommandLine(toolName: string, argsJson?: string): string {
  const args = getToolInput(toolName, argsJson);
  // ssh_exec：命令行摘要带目标主机 —— 审批卡片必须能看到会打到哪台机器。
  if (toolName === "ssh_exec") {
    const host =
      (typeof args.targetLabel === "string" ? args.targetLabel : "") ||
      (typeof args.host === "string" ? args.host.trim() : "") ||
      (typeof args.hostId === "string" ? args.hostId.trim() : "");
    const rawCmd = extractCommand(args);
    const cmd = args.sudo === true ? `[root] ${rawCmd}` : rawCmd;
    if (host && cmd) return `[${host}] ${cmd}`;
    if (cmd) return cmd;
  }
  // ssh_hosts：`action host` 摘要 —— 审批卡头部直接显示要做的操作。
  if (toolName === "ssh_hosts") {
    const action = typeof args.action === "string" ? args.action.trim() : "";
    const fields = (args.fields ?? {}) as Record<string, unknown>;
    const host =
      (typeof args.targetLabel === "string" ? args.targetLabel : "") ||
      (typeof args.host === "string" && args.host.trim()) ||
      (typeof fields.name === "string" ? fields.name.trim() : "");
    if (action) return host ? `${action} ${host}` : action;
  }
  // ssh_* 远程文件工具：摘要带 [hostId] 前缀（对齐 ssh_exec）。
  if (
    toolName === "ssh_read" ||
    toolName === "ssh_write" ||
    toolName === "ssh_glob" ||
    toolName === "ssh_grep" ||
    toolName === "ssh_cwd"
  ) {
    const hostId = typeof args.targetLabel === "string" ? args.targetLabel : typeof args.hostId === "string" ? args.hostId.trim() : "";
    const p =
      (typeof args.path === "string" && args.path.trim()) ||
      (typeof args.pattern === "string" ? args.pattern.trim() : "");
    if (hostId && p) return `[${hostId}] ${p}`;
    if (p) return p;
  }
  if (toolName === "ssh_edit") {
    const hostId = typeof args.targetLabel === "string" ? args.targetLabel : typeof args.hostId === "string" ? args.hostId.trim() : "";
    const input = typeof args.input === "string" ? args.input : "";
    const firstSection = input.split("\n").find((l) => l.trim().startsWith("["));
    const head = firstSection || input;
    if (hostId && head) return `[${hostId}] ${head.slice(0, 120)}`;
    if (head) return head.slice(0, 120);
  }
  if (toolName === "Terminal" && typeof args.targetLabel === "string") return `[${args.targetLabel}] ${extractCommand(args)}`;
  const fromFields = extractCommand(args);
  if (fromFields) return fromFields;

  const summary = formatToolSummary(toolName, argsJson);
  if (summary) return summary;

  const raw = argsJson?.trim() ?? "";
  if (raw && raw !== "{}" && raw !== "[]") return raw;
  return "";
}

export function parseToolOutput(preview?: string): unknown {
  if (!preview?.trim()) return undefined;
  const key = preview;
  if (outputCache.has(key)) return outputCache.get(key);
  let parsed: unknown;
  try {
    parsed = JSON.parse(preview);
  } catch {
    parsed = preview;
  }
  return remember(outputCache, key, parsed);
}

export function extractStdout(output: unknown): string {
  if (!output || typeof output !== "object") {
    return typeof output === "string" ? output : "";
  }
  const obj = output as Record<string, unknown>;
  // merged `output` first (pi-contract bash); stdout/content for older messages
  if (typeof obj.output === "string") return obj.output;
  if (typeof obj.stdout === "string") return obj.stdout;
  if (typeof obj.content === "string") return obj.content;
  if (typeof obj.error === "string") return obj.error;
  return "";
}

export function extractFilePath(input: Record<string, unknown>): string {
  const path =
    (typeof input.path === "string" && input.path) ||
    (typeof input.file_path === "string" && input.file_path) ||
    (typeof input.filePath === "string" && input.filePath) ||
    (typeof input.notebook_path === "string" && input.notebook_path) ||
    "";
  return path;
}

export function extractCommand(input: Record<string, unknown>): string {
  return (
    (typeof input.command === "string" && input.command) ||
    (typeof input.cmd === "string" && input.cmd) ||
    (typeof input.script === "string" && input.script) ||
    (typeof input.description === "string" && input.description) ||
    ""
  );
}
