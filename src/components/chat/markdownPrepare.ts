import type { WebCitation } from "../../shared/webCitation";

const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})/;

interface FenceState {
  /** fence marker char, "`" or "~" */
  marker: string;
  /** marker length of the opening fence */
  length: number;
}

/** A closing fence repeats the opening char and is at least as long. */
function closingFence(line: string, open: FenceState): boolean {
  const m = FENCE_OPEN_RE.exec(line);
  if (!m) return false;
  return m[1][0] === open.marker && m[1].length >= open.length;
}

/** Count pipes that are not backslash-escaped (`\\|` is a real pipe). */
function countUnescapedPipes(line: string): number {
  let count = 0;
  let escaped = false;
  for (const ch of line) {
    if (escaped) {
      escaped = false;
    } else if (ch === "\\") {
      escaped = true;
    } else if (ch === "|") {
      count += 1;
    }
  }
  return count;
}

/** Header candidate: flush-left `|` with at least a second pipe on the line. */
function isHeaderRow(line: string): boolean {
  if (!line.startsWith("|")) return false;
  return line.includes("|", 1);
}

/** Delimiter row: only `:` `-` `|` whitespace, at least one dash and one pipe
 *  (the pipe requirement keeps setext underlines like `---` out). */
function isDelimiterRow(line: string): boolean {
  const t = line.trim();
  let hasDash = false;
  for (let i = 0; i < t.length; i += 1) {
    const ch = t[i];
    if (ch === "-") {
      hasDash = true;
    } else if (ch !== ":" && ch !== "|" && ch !== " " && ch !== "\t") {
      return false;
    }
  }
  return hasDash && t.includes("|");
}

/**
 * GFM tables cannot interrupt a list / quote / html block. LLMs often emit
 * `- item` directly followed by `| a | b |` with no blank line, so the whole
 * table becomes lazy continuation lines and renders as raw pipes in one
 * paragraph. Insert a blank line before such header rows (only when the
 * previous line is non-blank and pipe-free, so adjacent tables and table
 * bodies stay untouched) and pad delimiter rows that have fewer pipes than
 * the header. Fenced code is skipped. Idempotent.
 */
export function normalizeGfmTables(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let fence: FenceState | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (fence) {
      out.push(line);
      if (closingFence(line, fence)) fence = null;
      continue;
    }
    const fm = FENCE_OPEN_RE.exec(line);
    if (fm) {
      fence = { marker: fm[1][0], length: fm[1].length };
      out.push(line);
      continue;
    }

    const next = lines[i + 1] ?? "";
    if (isHeaderRow(line) && isDelimiterRow(next)) {
      const prev = out.length > 0 ? out[out.length - 1] : "";
      // blank line only when the header would ride a list/quote/html block;
      // a pipe on the previous line means table body or an adjacent table
      if (prev.trim() !== "" && !prev.includes("|")) out.push("");

      out.push(line);
      // pad the delimiter up to the header's pipe count; a trailing-| row
      // grows with `---|`, a bare one with `|---` (never an empty cell)
      const headerPipes = countUnescapedPipes(line);
      const delimPipes = countUnescapedPipes(next);
      if (delimPipes < headerPipes) {
        const base = next.trimEnd();
        const suffix = base.endsWith("|") ? "---|" : "|---";
        out.push(base + suffix.repeat(headerPipes - delimPipes));
      } else {
        out.push(next);
      }
      i += 1; // delimiter row consumed
      continue;
    }

    out.push(line);
  }
  return out.join("\n");
}

const INLINE_CITATION_RE = /\[(\d{1,2})\](?!\()/g;
/** Inline code spans we must not rewrite: `...` (also skips the ` in `` ` ``). */
const CODE_SPAN_SPLIT_RE = /(`+[^`]*`+)/g;

function linkCitationsOnLine(
  line: string,
  byIndex: ReadonlyMap<number, WebCitation>,
): string {
  return line
    .split(CODE_SPAN_SPLIT_RE)
    .map((part, i) =>
      i % 2 === 1
        ? part // inline code span — leave verbatim
        : part.replace(INLINE_CITATION_RE, (whole, num: string) => {
            const c = byIndex.get(Number(num));
            // [\[n\]](url): escaped brackets keep the visible [n] while
            // GFM renders a real link (a bare [n](url) would drop them).
            return c ? `[\\[${num}\\]](${c.url})` : whole;
          }),
    )
    .join("");
}

/**
 * The system prompt tells the model to cite sources as plain [n] markers
 * (matching the WebCitations list under the reply). Turn those markers into
 * real markdown links — `[\[n\]](url)`, so the visible text stays `[n]` —
 * looked up by citation.index. Skips fenced code, inline code spans,
 * existing links ([n](url)), and out-of-range numbers.
 */
export function linkInlineCitations(
  md: string,
  citations?: readonly WebCitation[],
): string {
  if (!citations?.length || !md.includes("[")) return md;
  const byIndex = new Map<number, WebCitation>();
  for (const c of citations) byIndex.set(c.index, c);
  const lines = md.split("\n");
  const out: string[] = [];
  let fence: FenceState | null = null;

  for (const line of lines) {
    if (fence) {
      out.push(line);
      if (closingFence(line, fence)) fence = null;
      continue;
    }
    const fm = FENCE_OPEN_RE.exec(line);
    if (fm) {
      fence = { marker: fm[1][0], length: fm[1].length };
      out.push(line);
      continue;
    }
    out.push(linkCitationsOnLine(line, byIndex));
  }
  return out.join("\n");
}
