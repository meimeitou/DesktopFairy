import { memo } from "react";
import type { ChatMsg } from "../../shared/chatMessages";
import AgentToolRenderer from "./agentTools/AgentToolRenderer";
import AskUserQuestionCard from "./agentTools/AskUserQuestionCard";
import {
  type AskUserAnswers,
  isAskUserQuestionInteractive,
} from "./agentTools/askUserQuestionParse";
import ToolPermissionCard from "./agentTools/ToolPermissionCard";

interface ToolStepProps {
  msg: ChatMsg;
  onApprove?: (approvalId: string) => void;
  onDeny?: (approvalId: string) => void;
  onAlwaysAllow?: (approvalId: string) => void;
  onAnswer?: (answerId: string, answers: AskUserAnswers) => void;
  submittingApprovalId?: string | null;
  alwaysAllowLabel?: string;
}

function ToolCallBubble({
  msg,
  onApprove,
  onDeny,
  onAlwaysAllow,
  onAnswer,
  submittingApprovalId,
  alwaysAllowLabel,
}: ToolStepProps) {
  const status = msg.toolStatus || "streaming";
  const submitting = submittingApprovalId === msg.toolApprovalId;

  if (status === "awaiting_approval") {
    return (
      <div className="msg msg-tool">
        <ToolPermissionCard
          msg={msg}
          onApprove={onApprove}
          onDeny={onDeny}
          onAlwaysAllow={onAlwaysAllow}
          submitting={submitting}
          alwaysAllowLabel={alwaysAllowLabel}
        />
      </div>
    );
  }

  if (status === "awaiting_input" || isAskUserQuestionInteractive(msg)) {
    return (
      <div className="msg msg-tool">
        <AskUserQuestionCard
          msg={msg}
          onAnswer={onAnswer}
          submitting={submitting}
        />
      </div>
    );
  }

  return (
    <div className="msg msg-tool">
      <AgentToolRenderer msg={msg} />
    </div>
  );
}

export default memo(ToolCallBubble);
