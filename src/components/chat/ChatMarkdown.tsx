import { Button, Markdown, StreamingMarkdown, withChatPlugins } from "@cherrystudio/ui";
import { Play } from "lucide-react";

import { memo, useId, useMemo, type MouseEvent } from "react";
import {
  CodeBlock,
  CodeBlockCopyButton,
  type Components,
  type CustomRendererProps,
} from "streamdown";
import { normalizeGfmTables, linkInlineCitations } from "./markdownPrepare";
import { stashTerminalCommand } from "../../shared/panelHandoff";
import type { WebCitation } from "../../shared/webCitation";
import "streamdown/styles.css";
import "./ChatMarkdown.css";

interface Props {
  content: string;
  streaming?: boolean;
  /** Turn's web citations; lets plain [n] markers in the body open the source. */
  citations?: WebCitation[];
}

const SHELL_LANGS = [
  "bash",
  "sh",
  "shell",
  "zsh",
  "fish",
  "console",
  "terminal",
];

function ShellCodeRenderer({
  code: src,
  language,
  isIncomplete,
}: CustomRendererProps) {
  const handleRunInTerminal = () => {
    stashTerminalCommand(src);
    window.dispatchEvent(new CustomEvent("terminal:run-command"));
  };
  return (
    <div className="sd-shell-block">
      <div className="sd-shell-header">
        <span className="sd-shell-lang">{language || "code"}</span>
        <div className="sd-shell-actions">
          <Button variant="ghost" size="sm" className="sd-shell-run" onClick={handleRunInTerminal} title="在终端运行">
            <Play size={12} />
            在终端运行
          </Button>
          <CodeBlockCopyButton code={src} title="复制代码" />
        </div>
      </div>
      <CodeBlock code={src} language={language} isIncomplete={isIncomplete} />
    </div>
  );
}

const components: Components = {
  a({ href, children, ...props }) {
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
        } else {
          // LLM 输出不可信：javascript:/data: 等一律不交给原生 anchor。
          e.preventDefault();
        }
      } catch {
        // 解析失败的 href 同样不放行默认导航。
        e.preventDefault();
      }
    };
    return (
      <a href={href} rel="noopener noreferrer" onClick={handleClick} {...props}>
        {children}
      </a>
    );
  },
};

function ChatMarkdown({ content, streaming, citations }: Props) {
  const id = useId();
  const plugins = useMemo(
    () => ({
      ...withChatPlugins(),
      renderers: [{ language: SHELL_LANGS, component: ShellCodeRenderer }],
    }),
    [],
  );

  if (!content && streaming) return null;
  const body = linkInlineCitations(
    normalizeGfmTables(content),
    citations,
  );

  return (
    <div className={`chat-markdown${streaming ? " chat-markdown-streaming" : ""}`}>
      {streaming ? (
        <StreamingMarkdown
          id={id}
          animated={false}
          parseIncompleteMarkdown
          plugins={plugins}
          components={components}
        >
          {body}
        </StreamingMarkdown>
      ) : (
        <Markdown id={id} plugins={plugins} components={components}>
          {body}
        </Markdown>
      )}
    </div>
  );
}

export default memo(ChatMarkdown);
