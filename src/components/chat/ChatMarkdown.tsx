import { memo, type MouseEvent } from "react";
import {
  Streamdown,
  CodeBlock,
  CodeBlockCopyButton,
  type Components,
  type CustomRendererProps,
  type PluginConfig,
  type StreamdownTranslations,
} from "streamdown";
import { code } from "@streamdown/code";
import { cjk } from "@streamdown/cjk";
import { createMathPlugin } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { normalizeGfmTables } from "./markdownPrepare";
import "katex/dist/katex.min.css";
import "streamdown/styles.css";
import "./ChatMarkdown.css";

interface Props {
  content: string;
  streaming?: boolean;
}

const SHELL_LANGS = ["bash", "sh", "shell", "zsh", "fish", "console", "terminal"];

function ShellCodeRenderer({ code: src, language, isIncomplete }: CustomRendererProps) {
  const handleRunInTerminal = () => {
    window.dispatchEvent(
      new CustomEvent("terminal:run-command", { detail: { command: src } }),
    );
  };
  return (
    <div className="sd-shell-block">
      <div className="sd-shell-header">
        <span className="sd-shell-lang">{language || "code"}</span>
        <div className="sd-shell-actions">
          <button
            type="button"
            className="sd-shell-run"
            onClick={handleRunInTerminal}
            title="在终端运行"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            在终端运行
          </button>
          <CodeBlockCopyButton code={src} title="复制代码" />
        </div>
      </div>
      <CodeBlock code={src} language={language} isIncomplete={isIncomplete} />
    </div>
  );
}

const plugins: PluginConfig = {
  code,
  cjk,
  math: createMathPlugin({ singleDollarTextMath: true }),
  mermaid,
  renderers: [{ language: SHELL_LANGS, component: ShellCodeRenderer }],
};

const translations: Partial<StreamdownTranslations> = {
  copyCode: "复制",
  copied: "已复制",
  downloadFile: "下载",
  viewFullscreen: "全屏",
  exitFullscreen: "退出全屏",
  copyTable: "复制表格",
  copyTableAsCsv: "复制为 CSV",
  copyTableAsMarkdown: "复制为 Markdown",
  copyTableAsTsv: "复制为 TSV",
  downloadTable: "下载表格",
  downloadTableAsCsv: "下载为 CSV",
  downloadTableAsMarkdown: "下载为 Markdown",
  tableFormatCsv: "CSV",
  tableFormatMarkdown: "Markdown",
  tableFormatTsv: "TSV",
  copyLink: "复制链接",
  openLink: "打开链接",
  externalLinkWarning: "即将打开外部链接",
  openExternalLink: "打开",
  downloadImage: "下载图片",
  downloadDiagram: "下载图表",
  downloadDiagramAsMmd: "下载为 MMD",
  downloadDiagramAsPng: "下载为 PNG",
  downloadDiagramAsSvg: "下载为 SVG",
  mermaidFormatMmd: "MMD",
  mermaidFormatPng: "PNG",
  mermaidFormatSvg: "SVG",
  resetView: "重置视图",
  zoomIn: "放大",
  zoomOut: "缩小",
  imageNotAvailable: "图片不可用",
  close: "关闭",
};

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
        }
      } catch {
        // non-URL href: keep default behavior
      }
    };
    return (
      <a href={href} rel="noopener noreferrer" onClick={handleClick} {...props}>
        {children}
      </a>
    );
  },
};

function ChatMarkdown({ content, streaming }: Props) {
  if (!content && streaming) return null;

  return (
    <div className={`chat-markdown${streaming ? " chat-markdown-streaming" : ""}`}>
      <Streamdown
        mode={streaming ? "streaming" : "static"}
        isAnimating={streaming}
        caret="block"
        plugins={plugins}
        shikiTheme={["github-dark", "github-dark"]}
        lineNumbers={false}
        codeBlockMaxHeight={480}
        controls={{ table: { fullscreen: true }, mermaid: { fullscreen: true } }}
        translations={translations}
        components={components}
      >
        {normalizeGfmTables(content)}
      </Streamdown>
    </div>
  );
}

export default memo(ChatMarkdown);
