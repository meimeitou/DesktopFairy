import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import ChatMarkdown from "./ChatMarkdown";

const CODE = "line one\nline two\n\nline four";

describe("streamdown CSS bug fixes (SSR DOM shape)", () => {
  it("code block: every line is a top-level span under code (display:block via CSS)", () => {
    const html = renderToString(
      <ChatMarkdown content={"```ts\n" + CODE + "\n```"} />,
    );
    const i = html.indexOf('data-streamdown="code-block-body"');
    expect(i).toBeGreaterThan(-1);
    const code = html.slice(html.indexOf("<code", i), html.indexOf("</code>", i));
    const lineSpans = code.match(/<span class="block">/g) ?? [];
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

  it("streaming mode sets caret var on streamdown root div", () => {
    const html = renderToString(
      <ChatMarkdown content={"hello"} streaming />,
    );
    // caret suppresses when last block is an open fence; plain text keeps it
    expect(html).toContain("--streamdown-caret");
  });
});
