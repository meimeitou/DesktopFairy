import { useState, useCallback, isValidElement, type ReactNode } from "react";

const SHELL_LANGS = new Set(["bash", "sh", "shell", "zsh", "fish", "console", "terminal"]);

interface Props {
  children: ReactNode;
  className?: string;
}

function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children);
  }
  if (typeof node === "object" && "value" in node && typeof node.value === "string") {
    return node.value;
  }
  return "";
}

function languageFromClass(className?: string): string {
  if (!className) return "";
  const match = className.match(/language-([\w-]+)/);
  return match?.[1] ?? "";
}

export default function CodeBlock({ children, className }: Props) {
  const [copied, setCopied] = useState(false);
  const lang = languageFromClass(className);
  const code = extractText(children).replace(/\n$/, "");
  const isShell = SHELL_LANGS.has(lang);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }, [code]);

  const handleRunInTerminal = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("terminal:run-command", { detail: { command: code } }),
    );
  }, [code]);

  return (
    <div className="md-code-block">
      <div className="md-code-header">
        <span className="md-code-lang">{lang || "code"}</span>
        <div className="md-code-actions">
          {isShell && (
            <button
              type="button"
              className="md-code-run"
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
          )}
          <button
            type="button"
            className="md-code-copy"
            onClick={handleCopy}
            title="复制代码"
          >
            {copied ? "已复制" : "复制"}
          </button>
        </div>
      </div>
      <pre className={className}>
        <code>{children}</code>
      </pre>
    </div>
  );
}
