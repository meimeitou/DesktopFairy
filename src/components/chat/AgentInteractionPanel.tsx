import { Button } from "@cherrystudio/ui";
import { ChevronDown, ChevronUp, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { ChatMsg } from "../../shared/chatMessages";
import { getToolDisplayName } from "../../shared/toolCallDisplay";
import AskUserQuestionCard from "./agentTools/AskUserQuestionCard";
import ToolPermissionCard from "./agentTools/ToolPermissionCard";
import { type AskUserAnswers } from "./agentTools/askUserQuestionParse";
import {
  getPendingInteractions, isInteractionCompleted, markInteractionCompleted, pruneQuestionDrafts,
} from "./agentTools/interactionState";
import "./AgentInteractionPanel.css";

type ApprovalAction = (approvalId: string) => boolean | void | Promise<boolean | void>;

interface Props {
  sessionId: string;
  messages: ChatMsg[];
  active?: boolean;
  submittingApprovalId?: string | null;
  alwaysAllowLabel?: string;
  onApprove: ApprovalAction;
  onDeny: ApprovalAction;
  onAlwaysAllow: ApprovalAction;
  onAnswer: (answerId: string, answers: AskUserAnswers) => boolean | void | Promise<boolean | void>;
}

export default function AgentInteractionPanel({
  sessionId, messages, active = true, submittingApprovalId, alwaysAllowLabel,
  onApprove, onDeny, onAlwaysAllow, onAnswer,
}: Props) {
  // Use a render-trigger counter instead of React state for the completed Set so
  // that completed items survive component remounts (the Set lives in the module).
  const [, forceUpdate] = useState(0);
  const [collapsedKey, setCollapsedKey] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ key: string; text: string } | null>(null);
  const inFlight = useRef(new Set<string>());
  const contentId = useId();

  const pending = getPendingInteractions(messages);
  const queue = pending.filter((msg) => !isInteractionCompleted(sessionId, msg.id));
  const current = queue[0];
  const currentKey = current ? JSON.stringify([sessionId, current.id]) : "";
  const collapsed = collapsedKey === currentKey;

  useEffect(() => {
    pruneQuestionDrafts(sessionId, new Set(getPendingInteractions(messages).map((msg) => msg.id)));
  }, [sessionId, messages]);

  const respond = async (action: () => boolean | void | Promise<boolean | void>) => {
    if (!current || !current.toolApprovalId || inFlight.current.has(currentKey)) return false;
    const key = currentKey;
    const id = current.id;
    inFlight.current.add(key);
    setPendingId(key);
    setFailure(null);
    try {
      const ok = await action();
      if (ok === false) {
        setFailure({ key, text: "未能提交，请重试；若请求已失效，请停止当前任务。" });
        return false;
      }
      // Module-level tracking — survives remounts.
      markInteractionCompleted(sessionId, id);
      forceUpdate((n) => n + 1);
      return true;
    } catch {
      setFailure({ key, text: "提交失败，已保留填写内容，请重试。" });
      return false;
    } finally {
      inFlight.current.delete(key);
      setPendingId((prev) => prev === key ? null : prev);
    }
  };

  if (!current || !active) return null;
  const isQuestion = current.toolName === "AskUserQuestion" || current.toolStatus === "awaiting_input";
  const ready = current.toolStatus === "awaiting_approval" || current.toolStatus === "awaiting_input";
  const title = ready ? (isQuestion ? "等待回答" : "等待审批") : "正在准备问题";
  const submitting = pendingId === currentKey || (!!current.toolApprovalId && submittingApprovalId === current.toolApprovalId);

  return (
    <section className="agent-interaction-panel" aria-label={title}>
      <div className="agent-interaction-header">
        <span className="agent-interaction-title">
          {isQuestion ? <MessageCircleQuestion size={16} aria-hidden /> : <ShieldCheck size={16} aria-hidden />}
          <strong aria-live="polite">{title}</strong>
          <span className="agent-interaction-tool">{getToolDisplayName(current.toolName || "工具")}</span>
        </span>
        <span className="agent-interaction-count">{queue.length} 项待处理</span>
        <Button variant="ghost" size="sm" aria-expanded={!collapsed} aria-controls={contentId}
          aria-label={collapsed ? "展开待处理请求" : "收起待处理请求"}
          onClick={() => setCollapsedKey(collapsed ? null : currentKey)}>
          {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Button>
      </div>
      <div id={contentId} hidden={collapsed} className="agent-interaction-content">
        {failure?.key === currentKey && <p className="agent-interaction-error" role="alert">{failure.text}</p>}
        {isQuestion ? (
          <AskUserQuestionCard key={currentKey} sessionId={sessionId} msg={current}
            submitting={submitting}
            onAnswer={(id, answers) => respond(() => onAnswer(id, answers))} />
        ) : (
          <ToolPermissionCard key={currentKey} msg={current} submitting={submitting}
            alwaysAllowLabel={alwaysAllowLabel}
            onApprove={(id) => { void respond(() => onApprove(id)); }}
            onDeny={(id) => { void respond(() => onDeny(id)); }}
            onAlwaysAllow={(id) => { void respond(() => onAlwaysAllow(id)); }} />
        )}
      </div>
    </section>
  );
}
