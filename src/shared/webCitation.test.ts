import { describe, expect, it } from "vitest";
import { extractWebCitations } from "./webCitation";
import type { ToolTerminalState } from "./ai/stream";

const tool = (over: Partial<ToolTerminalState>): ToolTerminalState => ({
  toolCallId: "t1",
  toolName: "WebSearch",
  status: "done",
  resultPreview: "",
  ...over,
});

describe("extractWebCitations", () => {
  it("collects urls from successful WebSearch results in order", () => {
    const tools = [
      tool({
        resultPreview: JSON.stringify({
          ok: true,
          results: [
            { id: 1, title: "A", url: "https://a.com/1", content: "x" },
            { id: 2, title: "B", url: "https://b.com/2", content: "y" },
          ],
        }),
      }),
    ];
    expect(extractWebCitations(tools)).toEqual([
      { index: 1, title: "A", url: "https://a.com/1", source: "WebSearch" },
      { index: 2, title: "B", url: "https://b.com/2", source: "WebSearch" },
    ]);
  });

  it("includes WebFetch results tagged as WebFetch", () => {
    const tools = [
      tool({
        toolName: "WebFetch",
        resultPreview: JSON.stringify({
          ok: true,
          results: [{ id: 1, title: "https://c.com", url: "https://c.com", content: "z" }],
        }),
      }),
    ];
    expect(extractWebCitations(tools)).toEqual([
      { index: 1, title: "https://c.com", url: "https://c.com", source: "WebFetch" },
    ]);
  });

  it("dedupes by url across calls and keeps first-seen order", () => {
    const tools = [
      tool({
        resultPreview: JSON.stringify({
          ok: true,
          results: [{ id: 1, title: "A", url: "https://a.com" }],
        }),
      }),
      tool({
        toolCallId: "t2",
        resultPreview: JSON.stringify({
          ok: true,
          results: [
            { id: 1, title: "A dup", url: "https://a.com" },
            { id: 2, title: "B", url: "https://b.com" },
          ],
        }),
      }),
    ];
    const out = extractWebCitations(tools);
    expect(out).toHaveLength(2);
    expect(out[0].url).toBe("https://a.com");
    expect(out[1]).toMatchObject({ url: "https://b.com", index: 2 });
  });

  it("skips failed calls, non-web tools, bad json, and non-http urls", () => {
    const tools = [
      tool({ resultPreview: JSON.stringify({ ok: false, error: "boom" }) }),
      tool({ toolName: "bash", resultPreview: "ok" }),
      tool({ resultPreview: "not json" }),
      tool({
        resultPreview: JSON.stringify({
          ok: true,
          results: [{ id: 1, title: "F", url: "ftp://x" }],
        }),
      }),
    ];
    expect(extractWebCitations(tools)).toEqual([]);
  });

  it("caps at 8 citations", () => {
    const results = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      title: `T${i}`,
      url: `https://x.com/${i}`,
    }));
    const tools = [tool({ resultPreview: JSON.stringify({ ok: true, results }) })];
    expect(extractWebCitations(tools)).toHaveLength(8);
  });

  it("ignores streaming/running/error statuses", () => {
    const tools = [
      tool({ status: "running" }),
      tool({ status: "error", message: "x" }),
    ];
    expect(extractWebCitations(tools)).toEqual([]);
  });
});
