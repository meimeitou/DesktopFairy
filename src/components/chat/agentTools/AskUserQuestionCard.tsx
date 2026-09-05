import { useMemo, useState } from "react";
import RadioGroup, { CheckGroup } from "../../RadioGroup";
import type { ChatMsg } from "../../../shared/chatMessages";
import { getToolDisplayName } from "../../../shared/toolCallDisplay";
import {
  canSubmitAskUserAnswer,
  parseAskUserQuestions,
  type AskUserAnswers,
  type QuestionItem,
} from "./askUserQuestionParse";

export type { AskUserAnswers };

const OTHER_VALUE = "__other__";

function questionChoiceOptions(q: QuestionItem) {
  return [
    ...q.options.map((opt) => ({
      value: opt.label,
      label: opt.label,
      description: opt.description,
    })),
    { value: OTHER_VALUE, label: "其他", description: "自行输入" },
  ];
}

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
              {q.multiSelect ? (
                <CheckGroup
                  name={`ask-${msg.id}-${q.question}`}
                  ariaLabel={q.question}
                  disabled={submitting || submitted || !answerReady}
                  values={[
                    ...(selected[q.question] || []),
                    ...(otherSelected[q.question] ? [OTHER_VALUE] : []),
                  ]}
                  options={questionChoiceOptions(q)}
                  onChange={(next) => {
                    const useOther = next.includes(OTHER_VALUE);
                    setOtherSelected((prev) => ({ ...prev, [q.question]: useOther }));
                    setSelected((prev) => ({
                      ...prev,
                      [q.question]: next.filter((v) => v !== OTHER_VALUE),
                    }));
                  }}
                />
              ) : (
                <RadioGroup
                  name={`ask-${msg.id}-${q.question}`}
                  ariaLabel={q.question}
                  disabled={submitting || submitted || !answerReady}
                  value={
                    otherSelected[q.question]
                      ? OTHER_VALUE
                      : (selected[q.question]?.[0] ?? null)
                  }
                  options={questionChoiceOptions(q)}
                  onChange={(next) => {
                    if (next === OTHER_VALUE) {
                      setOtherSelected((prev) => ({ ...prev, [q.question]: true }));
                      setSelected((prev) => ({ ...prev, [q.question]: [] }));
                      return;
                    }
                    setOtherSelected((prev) => ({ ...prev, [q.question]: false }));
                    setSelected((prev) => ({ ...prev, [q.question]: [next] }));
                  }}
                />
              )}
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
