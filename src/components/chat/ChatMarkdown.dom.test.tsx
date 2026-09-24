import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import ChatMarkdown from "./ChatMarkdown";

const CODE = "line one\nline two\n\nline four";

describe("streamdown CSS bug fixes (SSR DOM shape)", () => {
  it("fenced code renders via streamdown code-block-body for every language", () => {
    const html = renderToString(
      <ChatMarkdown content={"```ts\n" + CODE + "\n```"} />,
    );
    // generic fences now use streamdown's own block (shiki gruvbox theming)
    const t = html.indexOf('data-streamdown="code-block-body"');
    expect(t).toBeGreaterThan(-1);
    // shell fences keep the streamdown code-block-body DOM (run-in-terminal UI)
    const shell = renderToString(
      <ChatMarkdown content={"```bash\n" + CODE + "\n```"} />,
    );
    const i = shell.indexOf('data-streamdown="code-block-body"');
    expect(i).toBeGreaterThan(-1);
    const code = shell.slice(
      shell.indexOf("<code", i),
      shell.indexOf("</code>", i),
    );
    const lineSpans = code.match(/<span class="block[ "]/g) ?? [];
    expect(lineSpans.length).toBe(4); // 4 lines incl. empty
    // empty line = raw "\n" text node; non-empty lines carry no newline text
    const textOnly = code.replace(/<[^>]+>/g, "");
    expect(textOnly).toContain("\n"); // empty line's newline
  });

  it("bold text renders span[data-streamdown=strong] (CSS supplies weight)", () => {
    const html = renderToString(
      <ChatMarkdown content={"**bold** and *italic*"} />,
    );
    expect(html).toContain('data-streamdown="strong"');
    expect(html).toContain("<em>");
  });

  it("image renders img[data-streamdown=image]", () => {
    const html = renderToString(
      <ChatMarkdown content={"![alt](https://example.com/a.png)"} />,
    );
    expect(html).toContain('data-streamdown="image"');
  });

  it("table header cells render with data-streamdown=table-header-cell", () => {
    const html = renderToString(
      <ChatMarkdown content={"| h1 | h2 |\n| --- | --- |\n| a | b |"} />,
    );
    expect(html).toContain('data-streamdown="table-header-cell"');
  });

  it("does not swallow prose after a single dollar sign", () => {
    const html = renderToString(
      <ChatMarkdown content={"价格 $12，环境变量 $PATH，后面还有正文"} />,
    );
    expect(html).toContain("$12");
    expect(html).toContain("$PATH");
    expect(html).toContain("后面还有正文");
  });

  it("streaming mode sets caret var on streamdown root div", () => {
    const html = renderToString(<ChatMarkdown content={"hello"} streaming />);
    // caret suppresses when last block is an open fence; plain text keeps it
    expect(html).toContain("--streamdown-caret");
  });
});
