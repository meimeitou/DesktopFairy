import type { ChatMsg } from "../../../shared/chatMessages";
import { getToolDisplayName } from "../../../shared/toolCallDisplay";
import { getToolCommandLine } from "./toolUtils";
import TerminalOutput from "./TerminalOutput";

interface Props {
  msg: ChatMsg;
  onApprove?: (approvalId: string) => void;
  onDeny?: (approvalId: string) => void;
  submitting?: boolean;
}

export default function ToolPermissionCard({
  msg,
  onApprove,
  onDeny,
  submitting = false,
}: Props) {
  const toolName = msg.toolName || "工具";
  const command = getToolCommandLine(toolName, msg.toolArgs);

  return (
    <div className="agent-tool-permission">
      <div className="agent-tool-permission-head-static">
        <span className="agent-tool-permission-title">
          {getToolDisplayName(toolName)}
        </span>
        <span className="agent-tool-permission-badge">等待确认</span>
      </div>
      <div className="agent-tool-permission-body">
        <div className="agent-tool-section-label">将执行的命令</div>
        {command ? (
          <TerminalOutput content={command} commandMode />
        ) : (
          <p className="agent-tool-permission-empty">正在等待模型返回命令参数…</p>
        )}
      </div>
      <div className="agent-tool-permission-actions">
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
          disabled={submitting || !msg.toolApprovalId || !command}
          onClick={() => msg.toolApprovalId && onApprove?.(msg.toolApprovalId)}
        >
          允许
        </button>
      </div>
    </div>
  );
}
