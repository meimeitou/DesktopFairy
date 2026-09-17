import { useContext, type KeyboardEvent, type ReactNode } from "react";
import { getToolDisplayName, getToolIcon } from "../../../shared/toolCallDisplay";
import { ToolCancelContext } from "./ToolCancelContext";

interface Props {
  toolName: string;
  params?: ReactNode;
  status?: ReactNode;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  /** 正在执行中时显示取消按钮，toolCallId 用于 per-tool cancel */
  cancelToolCallId?: string;
}

export default function ToolHeader({
  toolName,
  params,
  status,
  collapsible = false,
  expanded = true,
  onToggle,
  cancelToolCallId,
}: Props) {
  const cancelTool = useContext(ToolCancelContext);
  const showCancelBtn = !!cancelToolCallId && !!cancelTool;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!collapsible || !onToggle) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      className={`agent-tool-header${collapsible ? " agent-tool-header-collapsible" : ""}`}
      onClick={collapsible ? onToggle : undefined}
      onKeyDown={handleKeyDown}
      role={collapsible ? "button" : undefined}
      tabIndex={collapsible ? 0 : undefined}
      aria-expanded={collapsible ? expanded : undefined}
    >
      <span className="agent-tool-header-icon" aria-hidden>
        {getToolIcon(toolName)}
      </span>
      <div className="agent-tool-header-main">
        <div className="agent-tool-header-title-row">
          <strong>{getToolDisplayName(toolName)}</strong>
          {status}
        </div>
        {params && <div className="agent-tool-header-params">{params}</div>}
      </div>
      {showCancelBtn && (
        <button
          type="button"
          className="agent-tool-cancel-btn"
          onClick={(e) => {
            // 阻止冒泡：collapsible header 的 onClick 会展开/收起卡片
            e.stopPropagation();
            if (cancelToolCallId) cancelTool(cancelToolCallId);
          }}
        >
          取消
        </button>
      )}
      {collapsible && (
        <span
          className={`agent-tool-chevron${expanded ? " agent-tool-chevron-expanded" : ""}`}
          aria-hidden
        >
          ›
        </span>
      )}
    </div>
  );
}
