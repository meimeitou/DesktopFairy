import { memo, useState } from "react";

interface Props {
  content: string;
  commandMode?: boolean;
  /** Soft cap for rendered characters; expand to show full content. */
  maxChars?: number;
}

const DEFAULT_MAX_CHARS = 4_000;

function TerminalOutput({
  content,
  commandMode = false,
  maxChars = DEFAULT_MAX_CHARS,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  if (!content) return null;

  // Commands are usually short — never truncate command mode.
  const limit = commandMode ? Number.POSITIVE_INFINITY : maxChars;
  const needsTruncate = content.length > limit;
  const truncated = needsTruncate && !expanded;
  const shown = truncated ? content.slice(0, limit) : content;

  return (
    <div className="agent-tool-terminal-wrap">
      <pre
        className={`agent-tool-terminal${commandMode ? " agent-tool-terminal-command" : ""}`}
      >
        {shown}
        {truncated ? "…" : ""}
      </pre>
      {needsTruncate && (
        <button
          type="button"
          className="agent-tool-terminal-expand"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "收起" : `展开全部（${content.length.toLocaleString()} 字符）`}
        </button>
      )}
    </div>
  );
}

export default memo(TerminalOutput);
