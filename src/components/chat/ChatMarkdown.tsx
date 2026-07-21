import { memo, useMemo, type MouseEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkCjkFriendly from "remark-cjk-friendly";
import rehypeHighlight from "rehype-highlight";
import remend from "remend";
import type { Components } from "react-markdown";
import CodeBlock from "./CodeBlock";
import "./ChatMarkdown.css";
import "highlight.js/styles/github-dark.min.css";

interface Props {
  content: string;
  streaming?: boolean;
}

const remarkPlugins = [remarkGfm, remarkCjkFriendly];
const highlightPlugins = [rehypeHighlight];

const components: Components = {
  pre({ children }) {
    return <>{children}</>;
  },
  code({ className, children, ...props }) {
    const isBlock =
      Boolean(className) ||
      (typeof children === "string" && children.includes("\n"));
    if (isBlock) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }
    return (
      <code className="md-inline-code" {...props}>
        {children}
      </code>
    );
  },
  a({ href, children }) {
    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      if (!href) return;
      // remend may insert a placeholder for incomplete links while streaming
      if (href.startsWith("streamdown:")) {
        e.preventDefault();
        return;
      }
      try {
        const u = new URL(href);
        if (u.protocol === "http:" || u.protocol === "https:") {
          e.preventDefault();
          void window.electronAPI.invoke("browser:open", { url: href });
        }
      } catch {
        // non-URL href: keep default behavior
      }
    };
    return (
      <a href={href} rel="noopener noreferrer" onClick={handleClick}>
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="md-table-wrap">
        <table>{children}</table>
      </div>
    );
  },
  blockquote({ children }) {
    return <blockquote className="md-blockquote">{children}</blockquote>;
  },
};

/** Close an odd number of ``` fences so partial code blocks still render. */
function closeOpenCodeFence(md: string): string {
  let opens = 0;
  for (const line of md.split("\n")) {
    if (/^ {0,3}```/.test(line)) opens += 1;
  }
  if (opens % 2 === 1) return `${md}\n\`\`\``;
  return md;
}

/**
 * Streaming markdown like Cherry Studio / Streamdown:
 * - remend completes incomplete ** / ` / links mid-stream
 * - open code fences are closed so fenced blocks still paint
 * - rehype-highlight is deferred until stream ends (expensive re-tokenize)
 */
function prepareStreamingMarkdown(content: string): string {
  return closeOpenCodeFence(remend(content));
}

function ChatMarkdown({ content, streaming }: Props) {
  const displayContent = useMemo(
    () => (streaming ? prepareStreamingMarkdown(content) : content),
    [content, streaming],
  );

  if (!content && streaming) return null;

  return (
    <div
      className={`chat-markdown${streaming ? " chat-markdown-streaming" : ""}`}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={streaming ? undefined : highlightPlugins}
        components={components}
      >
        {displayContent}
      </ReactMarkdown>
      {streaming && <span className="md-stream-cursor" aria-hidden />}
    </div>
  );
}

export default memo(ChatMarkdown);
