import type { ChatMsg } from "./chatMessages";
import { parseToolArguments } from "./toolCallDisplay";

const API_SNIPPET_MAX = 120;
const API_FALLBACK_MAX = 200;

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function parseOutput(preview?: string): unknown {
  if (!preview?.trim()) return undefined;
  try {
    return JSON.parse(preview);
  } catch {
    return preview;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function summarizeWebSearch(output: unknown): string {
  if (!isRecord(output)) return "";
  const results = output.results;
  if (!Array.isArray(results) || results.length === 0) return "";
  const query = typeof output.query === "string" ? output.query : "";
  const lines = results.slice(0, 5).map((item, i) => {
    if (!isRecord(item)) return `${i + 1}. (result)`;
    const title = truncate(String(item.title || "无标题"), 60);
    const url = String(item.url || item.link || "");
    return `${i + 1}. ${title}${url ? ` <${url}>` : ""}`;
  });
  return query ? `query="${query}"\n${lines.join("\n")}` : lines.join("\n");
}

function summarizeWebFetch(output: unknown): string {
  if (!isRecord(output)) return "";
  const url = String(output.url || "");
  const status = output.status != null ? ` HTTP ${output.status}` : "";
  const content = typeof output.content === "string" ? output.content : "";
  const snippet = content ? truncate(content, API_SNIPPET_MAX) : "";
  return `${url}${status}${snippet ? `\n${snippet}` : ""}`.trim();
}

function summarizeGrep(output: unknown): string {
  if (!isRecord(output)) return "";
  const text = typeof output.output === "string" ? output.output : "";
  if (!text) return "(no matches)";
  const lines = text.split("\n").filter(Boolean).slice(0, 5);
  return lines.map((l) => truncate(l, API_SNIPPET_MAX)).join("\n");
}

function summarizeGlob(output: unknown): string {
  if (!isRecord(output)) return "";
  const matches = output.matches;
  if (!Array.isArray(matches)) return "";
  const cwd = typeof output.cwd === "string" ? output.cwd : "";
  const listed = matches.slice(0, 8).join(", ");
  const more = matches.length > 8 ? ` (+${matches.length - 8} more)` : "";
  return cwd ? `${cwd}: ${listed}${more}` : `${listed}${more}`;
}

function summarizeRead(msg: ChatMsg, output: unknown): string {
  const { args } = parseToolArguments(msg.toolArgs);
  const filePath =
    (typeof args.path === "string" && args.path) ||
    (typeof args.file_path === "string" && args.file_path) ||
    "";
  let contentLen = 0;
  if (isRecord(output)) {
    if (typeof output.content === "string") contentLen = output.content.length;
    else if (typeof output.stdout === "string") contentLen = output.stdout.length;
  } else if (typeof output === "string") {
    contentLen = output.length;
  }
  return filePath
    ? `Read ${filePath}${contentLen ? ` (${contentLen} chars)` : ""}`
    : contentLen
      ? `Read (${contentLen} chars)`
      : "Read";
}

/** Short summary for API history — avoids echoing full evidence in assistant replies. */
export function formatToolEvidenceForApi(msg: ChatMsg): string {
  const name = msg.toolName || "tool";
  const status = msg.toolStatus || "done";

  if (status === "denied" || status === "error") {
    return `[${name}] (${status}) ${msg.toolMessage || ""}`.trim();
  }

  const output = parseOutput(msg.toolResultPreview);
  let detail = "";

  switch (name) {
    case "WebSearch":
      detail = summarizeWebSearch(output);
      break;
    case "WebFetch":
      detail = summarizeWebFetch(output);
      break;
    case "Grep":
      detail = summarizeGrep(output);
      break;
    case "Glob":
      detail = summarizeGlob(output);
      break;
    case "Read":
      detail = summarizeRead(msg, output);
      break;
    case "Bash":
    case "Terminal": {
      if (isRecord(output)) {
        const stdout =
          typeof output.stdout === "string"
            ? output.stdout
            : typeof output.output === "string"
              ? output.output
              : "";
        detail = stdout ? truncate(stdout, API_SNIPPET_MAX) : "";
      }
      break;
    }
    default:
      break;
  }

  if (detail) {
    return `[${name}] (${status}) ${detail}`.trim();
  }

  const fallback = msg.toolResultPreview || msg.toolMessage || "";
  return `[${name}] (${status}) ${truncate(String(fallback), API_FALLBACK_MAX)}`.trim();
}

export interface ToolLogEntry {
  type: "tool" | "assistant";
  toolCallId?: string;
  toolName?: string;
  toolArgs?: string;
  resultText?: string;
  content?: string;
  timestamp?: number;
}

/** Repair tool messages missing previews from append-only backend log. */
export function mergeToolResultsFromLog(
  messages: ChatMsg[],
  logEntries: ToolLogEntry[],
): ChatMsg[] {
  const byCallId = new Map<string, string>();
  for (const entry of logEntries) {
    if (entry.type === "tool" && entry.toolCallId && entry.resultText) {
      byCallId.set(entry.toolCallId, entry.resultText);
    }
  }
  if (byCallId.size === 0) return messages;

  return messages.map((m) => {
    if (m.type !== "tool" || m.toolResultPreview?.trim() || !m.toolCallId) {
      return m;
    }
    const full = byCallId.get(m.toolCallId);
    if (!full) return m;
    return {
      ...m,
      toolResultPreview: full,
      toolResultBytes: m.toolResultBytes ?? full.length,
    };
  });
}
