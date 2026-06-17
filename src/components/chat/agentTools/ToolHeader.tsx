import type { KeyboardEvent, ReactNode } from "react";
import { getToolDisplayName, getToolIcon } from "../../../shared/toolCallDisplay";

interface Props {
  toolName: string;
  params?: ReactNode;
  status?: ReactNode;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}

export default function ToolHeader({
  toolName,
  params,
  status,
  collapsible = false,
  expanded = true,
  onToggle,
}: Props) {
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
