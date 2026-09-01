import { useEffect, useRef, useState } from "react";
import Tooltip from "../Tooltip";
import type { ContextUsageResult } from "../../shared/contextUsage";
import "./ContextUsageMeter.css";

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function ringColor(percent: number): string {
  if (percent >= 80) return "var(--rust-bright)";
  if (percent >= 60) return "var(--persimmon)";
  return "var(--bone-500)";
}

interface Props {
  usage: ContextUsageResult;
  disabled?: boolean;
}

export default function ContextUsageMeter({ usage, disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const percent = Math.min(100, Math.max(0, usage.percent));
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const tip = `上下文 ${Math.round(percent)}%`;

  return (
    <div className="context-usage-meter" ref={containerRef}>
      <Tooltip tip={tip} placement="top">
        <button
          type="button"
          className={`context-usage-btn${open ? " open" : ""}`}
          onClick={() => !disabled && setOpen((v) => !v)}
          disabled={disabled}
          aria-label={tip}
          aria-expanded={open}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            aria-hidden="true"
          >
            <circle
              className="context-usage-track"
              cx="9"
              cy="9"
              r={radius}
              fill="none"
              strokeWidth="2.5"
            />
            <circle
              className="context-usage-fill"
              cx="9"
              cy="9"
              r={radius}
              fill="none"
              strokeWidth="2.5"
              stroke={ringColor(percent)}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 9 9)"
            />
          </svg>
        </button>
      </Tooltip>

      {open && (
        <div className="context-usage-panel" role="dialog" aria-label="上下文用量">
          <div className="context-usage-panel-header">
            <span>上下文用量</span>
            <span className="context-usage-estimate">估算</span>
          </div>
          <div className="context-usage-summary">
            <span className="context-usage-percent">{Math.round(percent)}%</span>
            <span className="context-usage-total">
              {formatTokenCount(usage.used)} / {formatTokenCount(usage.contextWindow)} tokens
            </span>
          </div>
          <dl className="context-usage-breakdown">
            <div>
              <dt>系统提示</dt>
              <dd>{formatTokenCount(usage.breakdown.system)}</dd>
            </div>
            <div>
              <dt>历史消息</dt>
              <dd>{formatTokenCount(usage.breakdown.history)}</dd>
            </div>
            <div>
              <dt>当前输入</dt>
              <dd>{formatTokenCount(usage.breakdown.input)}</dd>
            </div>
            <div>
              <dt>附件</dt>
              <dd>{formatTokenCount(usage.breakdown.attachments)}</dd>
            </div>
          </dl>
          <div className="context-usage-footer">
            <span>剩余约 {formatTokenCount(usage.remaining)}</span>
            <span>发送上限 {formatTokenCount(usage.sendBudget)}</span>
          </div>
          {usage.discardedCount > 0 && (
            <p className="context-usage-warn">
              已丢弃 {usage.discardedCount} 条较早消息（超出发送预算）
            </p>
          )}
          {usage.lastServerPromptTokens != null && (
            <p className="context-usage-server">
              上次请求（服务端）：
              {formatTokenCount(usage.lastServerPromptTokens)} prompt
              {usage.lastServerCompletionTokens != null && (
                <> · {formatTokenCount(usage.lastServerCompletionTokens)} completion</>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
