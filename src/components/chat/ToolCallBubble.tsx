import type { ChatMsg } from "../../shared/chatMessages";
import AgentToolRenderer from "./agentTools/AgentToolRenderer";
import ToolPermissionCard from "./agentTools/ToolPermissionCard";

interface ToolStepProps {
  msg: ChatMsg;
  onApprove?: (approvalId: string) => void;
  onDeny?: (approvalId: string) => void;
  submittingApprovalId?: string | null;
}

function AgentToolStep({
  msg,
  onApprove,
  onDeny,
  submittingApprovalId,
}: ToolStepProps) {
  const status = msg.toolStatus || "streaming";
  const submitting = submittingApprovalId === msg.toolApprovalId;

  if (status === "awaiting_approval") {
    return (
      <li className="agent-tool-step-wrap">
        <ToolPermissionCard
          msg={msg}
          onApprove={onApprove}
          onDeny={onDeny}
          submitting={submitting}
        />
      </li>
    );
  }

  return (
    <li className="agent-tool-step-wrap">
      <AgentToolRenderer msg={msg} />
    </li>
  );
}

interface GroupProps {
  tools: ChatMsg[];
  onApprove?: (approvalId: string) => void;
  onDeny?: (approvalId: string) => void;
  submittingApprovalId?: string | null;
}

export function ToolCallGroup({
  tools,
  onApprove,
  onDeny,
  submittingApprovalId,
}: GroupProps) {
  const waiting = tools.filter((t) => t.toolStatus === "awaiting_approval").length;
  const running = tools.filter(
    (t) => t.toolStatus === "running" || t.toolStatus === "streaming",
  ).length;
  const done = tools.filter((t) => t.toolStatus === "done").length;
  const failed = tools.filter(
    (t) => t.toolStatus === "error" || t.toolStatus === "denied",
  ).length;

  let meta = `${tools.length} 个工具`;
  if (waiting > 0) meta = `${waiting} 个待确认`;
  else if (running > 0) meta = `${running} 个执行中`;
  else if (failed > 0) meta = `${failed} 个失败 · ${done} 个完成`;
  else meta = `${done} 个已完成`;

  return (
    <div className="msg msg-tool-group">
      <div className="msg-tool-group-card">
        <div className="msg-tool-group-head">
          <span className="msg-tool-group-title">工具调用</span>
          <span className="msg-tool-group-meta">{meta}</span>
        </div>
        <ul className="agent-tool-steps">
          {tools.map((tool) => (
            <AgentToolStep
              key={tool.id}
              msg={tool}
              onApprove={onApprove}
              onDeny={onDeny}
              submittingApprovalId={submittingApprovalId}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

interface BubbleProps {
  msg: ChatMsg;
  onApprove?: (approvalId: string) => void;
  onDeny?: (approvalId: string) => void;
  submittingApprovalId?: string | null;
}

export default function ToolCallBubble({
  msg,
  onApprove,
  onDeny,
  submittingApprovalId,
}: BubbleProps) {
  return (
    <ToolCallGroup
      tools={[msg]}
      onApprove={onApprove}
      onDeny={onDeny}
      submittingApprovalId={submittingApprovalId}
    />
  );
}
