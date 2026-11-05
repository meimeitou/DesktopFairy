import type { ToolTerminalState } from "./ai/stream";

/** Display-only source link attached under an assistant reply. */
export interface WebCitation {
  /** 1-based index shown as [n] in the reply. */
  index: number;
  title: string;
  url: string;
  /** Tool that produced it: WebSearch or WebFetch. */
  source: "WebSearch" | "WebFetch";
}

interface WebToolResult {
  ok?: boolean;
  results?: Array<{ id?: number; title?: string; url?: string; content?: string }>;
}

const MAX_CITATIONS = 8;

/**
 * Collect source links from this turn's WebSearch/WebFetch tool snapshots.
 * Failed calls (`ok:false`) and entries without a usable URL are skipped.
 * Dedupes by URL across calls, preserving first-seen order.
 */
export function extractWebCitations(
  tools: ToolTerminalState[] | undefined,
): WebCitation[] {
  const seen = new Set<string>();
  const out: WebCitation[] = [];
  for (const tool of tools || []) {
    if (tool.status !== "done") continue;
    const name = tool.toolName || "";
    const source = name === "WebFetch" ? "WebFetch" : name === "WebSearch" ? "WebSearch" : null;
    if (!source) continue;
    let parsed: WebToolResult | null = null;
    try {
      parsed = JSON.parse(tool.resultPreview || "");
    } catch {
      continue;
    }
    if (!parsed || parsed.ok === false || !Array.isArray(parsed.results)) continue;
    for (const item of parsed.results) {
      const url = String(item?.url || "").trim();
      if (!url || !/^https?:\/\//i.test(url)) continue;
      if (seen.has(url)) continue;
      seen.add(url);
      out.push({
        index: out.length + 1,
        title: String(item?.title || url).trim() || url,
        url,
        source,
      });
      if (out.length >= MAX_CITATIONS) return out;
    }
  }
  return out;
}
