import { describe, expect, it } from "vitest";
import remend from "remend";

/** Mirrors ChatMarkdown closeOpenCodeFence for unit coverage. */
function closeOpenCodeFence(md: string): string {
  let opens = 0;
  for (const line of md.split("\n")) {
    if (/^ {0,3}```/.test(line)) opens += 1;
  }
  if (opens % 2 === 1) return `${md}\n\`\`\``;
  return md;
}

function prepareStreamingMarkdown(content: string): string {
  return closeOpenCodeFence(remend(content));
}

describe("prepareStreamingMarkdown", () => {
  it("closes incomplete bold via remend", () => {
    expect(prepareStreamingMarkdown("hello **world")).toContain("**world**");
  });

  it("closes an open code fence", () => {
    const src = "before\n```ts\nconst x = 1;";
    const out = prepareStreamingMarkdown(src);
    expect(out.trimEnd().endsWith("```")).toBe(true);
  });

  it("does not double-close a finished fence", () => {
    const src = "```ts\nconst x = 1;\n```";
    expect(prepareStreamingMarkdown(src)).toBe(src);
  });
});
