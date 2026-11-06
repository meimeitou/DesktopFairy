import { describe, expect, it } from "vitest";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { linkInlineCitations, normalizeGfmTables } from "./markdownPrepare";

describe("linkInlineCitations", () => {
  const cits = [
    { index: 1, url: "https://a.com", title: "A", source: "WebSearch" },
    { index: 2, url: "https://b.com", title: "B", source: "WebSearch" },
  ];

  it("links [n] markers by citation index, keeping visible [n]", () => {
    expect(linkInlineCitations("结论一[1]，结论二[2]。", cits)).toBe(
      "结论一[\\[1\\]](https://a.com)，结论二[\\[2\\]](https://b.com)。",
    );
  });

  it("handles concatenated markers like [1][2]", () => {
    expect(linkInlineCitations("见[1][2]", cits)).toBe(
      "见[\\[1\\]](https://a.com)[\\[2\\]](https://b.com)",
    );
  });

  it("maps by citation.index, not array position", () => {
    const sparse = [{ index: 3, url: "https://c.com", title: "C", source: "WebFetch" }];
    expect(linkInlineCitations("[3] 但不是 [1]", sparse)).toBe(
      "[\\[3\\]](https://c.com) 但不是 [1]",
    );
  });

  it("leaves out-of-range markers and text without brackets alone", () => {
    expect(linkInlineCitations("见[3]和[9]", cits)).toBe("见[3]和[9]");
    expect(linkInlineCitations("无标记", cits)).toBe("无标记");
  });

  it("skips fenced code, inline code, and existing links", () => {
    expect(
      linkInlineCitations("```\n[1] in code\n```\n[1]", cits),
    ).toBe("```\n[1] in code\n```\n[\\[1\\]](https://a.com)");
    expect(linkInlineCitations("`[1]` 与 [2]", cits)).toBe(
      "`[1]` 与 [\\[2\\]](https://b.com)",
    );
    expect(linkInlineCitations("[1](https://x.com)", cits)).toBe(
      "[1](https://x.com)",
    );
  });

  it("returns input unchanged without citations", () => {
    expect(linkInlineCitations("[1] 文本", undefined)).toBe("[1] 文本");
  });
});

type MdNode = { type?: string; children?: MdNode[] };

function countTables(root: MdNode): number {
  let count = 0;
  const stack: MdNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as MdNode;
    if (node.type === "table") count += 1;
    for (const child of node.children ?? []) stack.push(child);
  }
  return count;
}

/** Same parser stack ChatMarkdown uses: remark-parse + [gfm, cjk-friendly]. */
function parseTableCount(md: string): number {
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkCjkFriendly)
    .parse(md) as unknown as MdNode;
  return countTables(tree);
}

const USER_REPORT = `有两条路线：
1. 美区 Apple ID 内购
2. AuthSession 令牌
| 路线 | 原理 | 风险|
|---|---|---|
| A. 苹果内购 | 商家用美区 ID，走 内购给你的账号订阅 | 低（通道，OpenAI 不拦） |
| B. AuthSession / Token | 你在自己浏览器登录 chatgpt.com，复制一段临时 JSON 会话令牌给，平台完成支付 | 中（是敏感凭证，用完必须退出登） |`;


describe("normalizeGfmTables", () => {
  it("inserts a blank line between a list item and a flush-left table", () => {
    const src = "- 项目一\n| a | b |\n|---|---|\n| 1 | 2 |";
    expect(normalizeGfmTables(src)).toBe(
      "- 项目一\n\n| a | b |\n|---|---|\n| 1 | 2 |",
    );
  });

  it("inserts a blank line after blockquotes and html blocks", () => {
    expect(normalizeGfmTables("> 引用\n| a | b |\n|---|---|")).toBe(
      "> 引用\n\n| a | b |\n|---|---|",
    );
    expect(normalizeGfmTables("<br>\n| a | b |\n|---|---|")).toBe(
      "<br>\n\n| a | b |\n|---|---|",
    );
  });

  it("pads a delimiter row that is short on columns", () => {
    expect(normalizeGfmTables("| a | b | c |\n|---|---|")).toBe(
      "| a | b | c |\n|---|---|---|",
    );
  });

  it("pads but does not insert a blank line when the table is the first line", () => {
    expect(normalizeGfmTables("| a | b | c |\n|---|")).toBe(
      "| a | b | c |\n|---|---|---|",
    );
  });

  it("leaves tables alone when the previous line contains a pipe", () => {
    const src = "| x | y |\n| a | b |\n|---|---|";
    expect(normalizeGfmTables(src)).toBe(src);
  });

  it("leaves setext underlines and fenced code untouched", () => {
    expect(normalizeGfmTables("Title\n---")).toBe("Title\n---");
    const fenced = "intro\n```\n| a | b |\n|---|---|\n```\nafter";
    expect(normalizeGfmTables(fenced)).toBe(fenced);
  });

  it("is idempotent", () => {
    const src =
      "段落\n\n- 项目一\n| a | b | c |\n|---|---|\n| 1 | 2 |\n\n> 引用\n| x | y |\n|---|---|\n| 1 | 2 |";
    const once = normalizeGfmTables(src);
    expect(normalizeGfmTables(once)).toBe(once);
  });
});

describe("normalizeGfmTables (user report regression)", () => {
  it("turns the user-reported list+table into a real GFM table", () => {
    // pre-fix: the table rides the list as lazy continuation → no table node
    expect(parseTableCount(USER_REPORT)).toBe(0);
    expect(parseTableCount(normalizeGfmTables(USER_REPORT))).toBe(1);
  });
});
