import {
  formatToolSummary,
  parseToolArguments,
} from "../../../shared/toolCallDisplay";

export function getToolInput(
  toolName: string,
  argsJson?: string
): Record<string, unknown> {
  return parseToolArguments(argsJson).args;
}

export function getToolCommandLine(toolName: string, argsJson?: string): string {
  const { args, raw } = parseToolArguments(argsJson);
  const fromFields = extractCommand(args);
  if (fromFields) return fromFields;

  const summary = formatToolSummary(toolName, argsJson);
  if (summary) return summary;

  if (raw && raw !== "{}" && raw !== "[]") return raw;
  return "";
}

export function parseToolOutput(preview?: string): unknown {
  if (!preview?.trim()) return undefined;
  try {
    return JSON.parse(preview);
  } catch {
    return preview;
  }
}

export function extractStdout(output: unknown): string {
  if (!output || typeof output !== "object") {
    return typeof output === "string" ? output : "";
  }
  const obj = output as Record<string, unknown>;
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
