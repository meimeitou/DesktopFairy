import { useState, useCallback, isValidElement, type ReactNode } from "react";

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

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }, [code]);

  return (
    <div className="md-code-block">
      <div className="md-code-header">
        <span className="md-code-lang">{lang || "code"}</span>
        <button
          type="button"
          className="md-code-copy"
          onClick={handleCopy}
          title="复制代码"
        >
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <pre className={className}>
        <code>{children}</code>
      </pre>
    </div>
  );
}
