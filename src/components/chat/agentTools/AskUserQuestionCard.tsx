import { useMemo, useState } from "react";
import type { ChatMsg } from "../../../shared/chatMessages";
import { getToolDisplayName } from "../../../shared/toolCallDisplay";
import {
  canSubmitAskUserAnswer,
  parseAskUserQuestions,
  type AskUserAnswers,
} from "./askUserQuestionParse";

export type { AskUserAnswers };

interface Props {
  msg: ChatMsg;
  onAnswer?: (
    answerId: string,
    answers: AskUserAnswers,
  ) => void | boolean | Promise<void | boolean>;
  submitting?: boolean;
}

export default function AskUserQuestionCard({
  msg,
  onAnswer,
  submitting = false,
}: Props) {
  const questions = useMemo(
    () => parseAskUserQuestions(msg),
    [msg.toolArgs, msg.toolName],
  );
  const answerReady = canSubmitAskUserAnswer(msg);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [otherSelected, setOtherSelected] = useState<Record<string, boolean>>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const toggleOption = (question: string, label: string, multi: boolean) => {
    if (!multi) {
      setOtherSelected((prev) => ({ ...prev, [question]: false }));
    }
    setSelected((prev) => {
      const current = prev[question] || [];
      if (multi) {
        const has = current.includes(label);
        return {
          ...prev,
          [question]: has ? current.filter((x) => x !== label) : [...current, label],
        };
      }
      return { ...prev, [question]: [label] };
    });
  };

  const toggleOther = (question: string, multi: boolean) => {
    setOtherSelected((prev) => {
      const next = !prev[question];
      if (!multi && next) {
        setSelected((s) => ({ ...s, [question]: [] }));
      }
      return { ...prev, [question]: next };
    });
  };

  const canSubmit =
    answerReady &&
    !submitted &&
    questions.length > 0 &&
    questions.every((q) => {
      const picks = selected[q.question] || [];
      const useOther = otherSelected[q.question];
      const other = String(otherText[q.question] || "").trim();
      if (useOther && other) return true;
      if (useOther && !other) return false;
      if (picks.length > 0) return true;
      // 无预设选项时仅允许「其他」
      return q.options.length === 0 && useOther && other.length > 0;
    });

  const handleSubmit = () => {
    if (!msg.toolApprovalId || !canSubmit || submitting || submitted) return;
    const answers: AskUserAnswers = {};
    for (const q of questions) {
      const parts: string[] = [...(selected[q.question] || [])];
      if (otherSelected[q.question]) {
        const text = String(otherText[q.question] || "").trim();
        if (text) parts.push(text);
      }
      answers[q.question] = parts.join(", ");
    }
    setSubmitted(true);
    void Promise.resolve(onAnswer?.(msg.toolApprovalId, answers)).then((ok) => {
      if (ok === false) setSubmitted(false);
    });
  };

  return (
    <div
      className="agent-tool-ask"
      data-tool-approval-id={msg.toolApprovalId ?? undefined}
    >
      <div className="agent-tool-ask-head">
        <span className="agent-tool-ask-title">
          {getToolDisplayName(msg.toolName || "AskUserQuestion")}
        </span>
        <span className="agent-tool-ask-badge">
          {answerReady ? "等待回答" : "准备问题…"}
        </span>
      </div>
      <div className="agent-tool-ask-body">
        {questions.length === 0 ? (
          <p className="agent-tool-permission-empty">正在等待模型返回问题…</p>
        ) : (
          questions.map((q) => (
            <div key={q.question} className="agent-tool-ask-question">
              {q.header && (
                <div className="agent-tool-ask-question-header">{q.header}</div>
              )}
              <div className="agent-tool-ask-question-text">{q.question}</div>
              <div className="agent-tool-ask-options">
                {q.options.map((opt) => {
                  const active = (selected[q.question] || []).includes(opt.label);
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      className={`agent-tool-ask-option${active ? " active" : ""}`}
                      disabled={submitting || submitted || !answerReady}
                      onClick={() => toggleOption(q.question, opt.label, !!q.multiSelect)}
                    >
                      <span className="agent-tool-ask-option-label">{opt.label}</span>
                      {opt.description && (
                        <span className="agent-tool-ask-option-desc">{opt.description}</span>
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`agent-tool-ask-option agent-tool-ask-option-other${
                    otherSelected[q.question] ? " active" : ""
                  }`}
                  disabled={submitting || submitted || !answerReady}
                  onClick={() => toggleOther(q.question, !!q.multiSelect)}
                >
                  <span className="agent-tool-ask-option-label">其他</span>
                  <span className="agent-tool-ask-option-desc">自行输入</span>
                </button>
              </div>
              {otherSelected[q.question] && (
                <input
                  className="agent-tool-ask-other-input"
                  type="text"
                  value={otherText[q.question] || ""}
                  disabled={submitting || submitted || !answerReady}
                  placeholder="请输入你的回答…"
                  onChange={(e) =>
                    setOtherText((prev) => ({ ...prev, [q.question]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSubmit) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
              )}
            </div>
          ))
        )}
      </div>
      <div className="agent-tool-ask-actions">
        <button
          type="button"
          className="agent-tool-btn agent-tool-btn-approve"
          disabled={submitting || submitted || !canSubmit}
          onClick={handleSubmit}
        >
          {submitted ? "已提交" : answerReady ? "提交回答" : "等待工具就绪…"}
        </button>
      </div>
    </div>
  );
}
