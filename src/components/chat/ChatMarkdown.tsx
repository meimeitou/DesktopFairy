import { memo, type MouseEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkCjkFriendly from "remark-cjk-friendly";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";
import CodeBlock from "./CodeBlock";
import "./ChatMarkdown.css";
import "highlight.js/styles/github-dark.min.css";

interface Props {
  content: string;
  streaming?: boolean;
}

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

function ChatMarkdown({ content, streaming }: Props) {
  if (!content && streaming) return null;

  return (
    <div
      className={`chat-markdown${streaming ? " chat-markdown-streaming" : ""}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkCjkFriendly]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
      {streaming && <span className="md-stream-cursor" aria-hidden />}
    </div>
  );
}

export default memo(ChatMarkdown);
