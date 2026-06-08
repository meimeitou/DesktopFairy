import { memo } from "react";
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
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
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
