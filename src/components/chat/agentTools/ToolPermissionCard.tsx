import type { ChatMsg } from "../../../shared/chatMessages";
import { formatToolSummary, getToolDisplayName } from "../../../shared/toolCallDisplay";
import { getToolCommandLine } from "./toolUtils";
import TerminalOutput from "./TerminalOutput";

interface Props {
  msg: ChatMsg;
  onApprove?: (approvalId: string) => void;
  onDeny?: (approvalId: string) => void;
  onAlwaysAllow?: (approvalId: string) => void;
  submitting?: boolean;
}

export default function ToolPermissionCard({
  msg,
  onApprove,
  onDeny,
  onAlwaysAllow,
  submitting = false,
}: Props) {
  const toolName = msg.toolName || "工具";
  const command = getToolCommandLine(toolName, msg.toolArgs);
  const summary = formatToolSummary(toolName, msg.toolArgs);
  const display = command || summary;
  const canApprove = !!msg.toolApprovalId && !!display;

  return (
    <div className="agent-tool-permission" data-tool-approval-id={msg.toolApprovalId ?? undefined}>
      <div className="agent-tool-permission-head-static">
        <span className="agent-tool-permission-title">
          {getToolDisplayName(toolName)}
        </span>
        <span className="agent-tool-permission-badge">等待确认</span>
      </div>
      <div className="agent-tool-permission-body">
        <div className="agent-tool-section-label">
          {command ? "将执行的命令" : "将执行的操作"}
        </div>
        {display ? (
          <TerminalOutput content={display} commandMode={!!command} />
        ) : (
          <p className="agent-tool-permission-empty">正在等待模型返回参数…</p>
        )}
      </div>
      <div className="agent-tool-permission-actions">
        <button
          type="button"
          className="agent-tool-btn agent-tool-btn-always-allow"
          disabled={submitting || !canApprove}
          onClick={() => msg.toolApprovalId && onAlwaysAllow?.(msg.toolApprovalId)}
          title="批准本次并切换为全自动模式，后续工具调用不再询问"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          始终允许
        </button>
        <button
          type="button"
          className="agent-tool-btn agent-tool-btn-deny"
          disabled={submitting || !msg.toolApprovalId}
          onClick={() => msg.toolApprovalId && onDeny?.(msg.toolApprovalId)}
        >
          拒绝
        </button>
        <button
          type="button"
          className="agent-tool-btn agent-tool-btn-approve"
          disabled={submitting || !canApprove}
          onClick={() => msg.toolApprovalId && onApprove?.(msg.toolApprovalId)}
        >
          允许
        </button>
      </div>
    </div>
  );
}
