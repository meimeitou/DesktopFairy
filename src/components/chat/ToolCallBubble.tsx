import { memo, useState } from "react";
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

const AgentToolStep = memo(function AgentToolStep({
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
      <li className="agent-tool-step-wrap">
        <ToolPermissionCard
          msg={msg}
          onApprove={onApprove}
          onDeny={onDeny}
          onAlwaysAllow={onAlwaysAllow}
          submitting={submitting}
          alwaysAllowLabel={alwaysAllowLabel}
        />
      </li>
    );
  }

  if (status === "awaiting_input" || isAskUserQuestionInteractive(msg)) {
    return (
      <li className="agent-tool-step-wrap">
        <AskUserQuestionCard
          msg={msg}
          onAnswer={onAnswer}
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
});

interface GroupProps {
  tools: ChatMsg[];
  onApprove?: (approvalId: string) => void;
  onDeny?: (approvalId: string) => void;
  onAlwaysAllow?: (approvalId: string) => void;
  onAnswer?: (answerId: string, answers: AskUserAnswers) => void;
  submittingApprovalId?: string | null;
  alwaysAllowLabel?: string;
}

function toolsArrayEqual(a: ChatMsg[], b: ChatMsg[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export const ToolCallGroup = memo(
  function ToolCallGroup({
    tools,
    onApprove,
    onDeny,
    onAlwaysAllow,
    onAnswer,
    submittingApprovalId,
    alwaysAllowLabel,
  }: GroupProps) {
    let waiting = 0;
    let running = 0;
    let done = 0;
    let failed = 0;
    let openAsk = 0;
    for (const t of tools) {
      const s = t.toolStatus;
      if (s === "awaiting_approval" || s === "awaiting_input") waiting += 1;
      else if (s === "running" || s === "streaming") running += 1;
      else if (s === "done") done += 1;
      else if (s === "error" || s === "denied") failed += 1;
      if (isAskUserQuestionInteractive(t)) openAsk += 1;
    }

    const allSettled = waiting === 0 && running === 0;
    const [userOpened, setUserOpened] = useState(false);
    const expanded = !allSettled || userOpened || openAsk > 0;

    let meta;
    if (openAsk > 0) meta = "等待你的回答";
    else if (waiting > 0) meta = `${waiting} 个待确认`;
    else if (running > 0) meta = `${running} 个执行中`;
    else if (failed > 0) meta = `${failed} 个失败 · ${done} 个完成`;
    else meta = `${done} 个已完成`;

    return (
      <div className="msg msg-tool-group">
        <div
          className={`msg-tool-group-card${allSettled && !expanded ? " msg-tool-group-collapsed" : ""}`}
        >
          <button
            type="button"
            className="msg-tool-group-head"
            onClick={() => {
              if (!allSettled) return;
              setUserOpened((v) => !v);
            }}
            aria-expanded={expanded}
          >
            <span className="msg-tool-group-title">工具调用</span>
            <span className="msg-tool-group-meta">{meta}</span>
            {allSettled && (
              <span
                className={`msg-tool-group-chevron${expanded ? " open" : ""}`}
                aria-hidden
              >
                ▾
              </span>
            )}
          </button>
          {expanded && (
            <ul className="agent-tool-steps">
              {tools.map((tool) => (
                <AgentToolStep
                  key={tool.id}
                  msg={tool}
                  onApprove={onApprove}
                  onDeny={onDeny}
                  onAlwaysAllow={onAlwaysAllow}
                  onAnswer={onAnswer}
                  submittingApprovalId={submittingApprovalId}
                  alwaysAllowLabel={alwaysAllowLabel}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  },
  (prev, next) =>
    toolsArrayEqual(prev.tools, next.tools) &&
    prev.submittingApprovalId === next.submittingApprovalId &&
    prev.alwaysAllowLabel === next.alwaysAllowLabel &&
    prev.onApprove === next.onApprove &&
    prev.onDeny === next.onDeny &&
    prev.onAlwaysAllow === next.onAlwaysAllow &&
    prev.onAnswer === next.onAnswer,
);

interface BubbleProps {
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
}: BubbleProps) {
  return (
    <ToolCallGroup
      tools={[msg]}
      onApprove={onApprove}
      onDeny={onDeny}
      onAlwaysAllow={onAlwaysAllow}
      onAnswer={onAnswer}
      submittingApprovalId={submittingApprovalId}
      alwaysAllowLabel={alwaysAllowLabel}
    />
  );
}

export default memo(ToolCallBubble);
