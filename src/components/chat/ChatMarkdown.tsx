import { Button, Icon } from "animal-island-ui";
import { memo, useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  Streamdown,
  CodeBlock,
  CodeBlockCopyButton,
  type Components,
  type CustomRendererProps,
  type DiagramPlugin,
  type MathPlugin,
  type PluginConfig,
  type StreamdownTranslations,
} from "streamdown";
import { code } from "@streamdown/code";
import { cjk } from "@streamdown/cjk";
import { normalizeGfmTables } from "./markdownPrepare";
import { stashTerminalCommand } from "../../shared/panelHandoff";
import "streamdown/styles.css";
import "./ChatMarkdown.css";

interface Props {
  content: string;
  streaming?: boolean;
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
          <Button
            type="text"
            size="small"
            className="sd-shell-run"
            onClick={handleRunInTerminal}
            title="在终端运行"
          >
            <Icon name="Play" size={12} />
            在终端运行
          </Button>
          <CodeBlockCopyButton code={src} title="复制代码" />
        </div>
      </div>
      <CodeBlock code={src} language={language} isIncomplete={isIncomplete} />
    </div>
  );
}

const basePlugins: PluginConfig = {
  code,
  cjk,
  renderers: [{ language: SHELL_LANGS, component: ShellCodeRenderer }],
};

const MATH_RE = /\$\$|\\\[|\\\(/;
const MERMAID_RE = /```\s*mermaid\b/;

let mathPluginCache: MathPlugin | null = null;
let mermaidPluginCache: DiagramPlugin | null = null;
let mathPluginPromise: Promise<MathPlugin> | null = null;
let mermaidPluginPromise: Promise<DiagramPlugin> | null = null;

function loadMathPlugin(): Promise<MathPlugin> {
  if (mathPluginCache) return Promise.resolve(mathPluginCache);
  if (!mathPluginPromise) {
    mathPluginPromise = import("@streamdown/math").then(async (mod) => {
      await import("katex/dist/katex.min.css");
      const plugin = mod.createMathPlugin({ singleDollarTextMath: false });
      mathPluginCache = plugin;
      return plugin;
    });
  }
  return mathPluginPromise;
}

function loadMermaidPlugin(): Promise<DiagramPlugin> {
  if (mermaidPluginCache) return Promise.resolve(mermaidPluginCache);
  if (!mermaidPluginPromise) {
    mermaidPluginPromise = import("@streamdown/mermaid").then((mod) => {
      mermaidPluginCache = mod.mermaid;
      return mod.mermaid;
    });
  }
  return mermaidPluginPromise;
}

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
  const wantMath = MATH_RE.test(content);
  const wantMermaid = MERMAID_RE.test(content);
  const [mathPlugin, setMathPlugin] = useState<MathPlugin | null>(
    () => mathPluginCache,
  );
  const [mermaidPlugin, setMermaidPlugin] = useState<DiagramPlugin | null>(
    () => mermaidPluginCache,
  );

  useEffect(() => {
    if (!wantMath || mathPlugin) return;
    let cancelled = false;
    void loadMathPlugin().then((plugin) => {
      if (!cancelled) setMathPlugin(plugin);
    });
    return () => {
      cancelled = true;
    };
  }, [wantMath, mathPlugin]);

  useEffect(() => {
    if (!wantMermaid || mermaidPlugin) return;
    let cancelled = false;
    void loadMermaidPlugin().then((plugin) => {
      if (!cancelled) setMermaidPlugin(plugin);
    });
    return () => {
      cancelled = true;
    };
  }, [wantMermaid, mermaidPlugin]);

  const plugins = useMemo(() => {
    if (!mathPlugin && !mermaidPlugin) return basePlugins;
    return {
      ...basePlugins,
      ...(mathPlugin ? { math: mathPlugin } : {}),
      ...(mermaidPlugin ? { mermaid: mermaidPlugin } : {}),
    };
  }, [mathPlugin, mermaidPlugin]);

  if (!content && streaming) return null;

  return (
    <div
      className={`chat-markdown${streaming ? " chat-markdown-streaming" : ""}`}
    >
      <Streamdown
        mode={streaming ? "streaming" : "static"}
        isAnimating={streaming}
        caret="block"
        plugins={plugins}
        shikiTheme={["gruvbox-dark-soft", "gruvbox-dark-soft"]}
        lineNumbers={false}
        codeBlockMaxHeight={480}
        tableMaxHeight={0}
        controls={{
          table: { fullscreen: true },
          mermaid: { fullscreen: true },
        }}
        translations={translations}
        components={components}
      >
        {normalizeGfmTables(content)}
      </Streamdown>
    </div>
  );
}

export default memo(ChatMarkdown);
