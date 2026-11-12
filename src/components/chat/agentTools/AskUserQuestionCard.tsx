import { Button, Input } from "@cherrystudio/ui";
import { Checkbox, Radio } from "../../Choice";
import { useId, useMemo, useRef, useState } from "react";
import type { ChatMsg } from "../../../shared/chatMessages";
import {
  canSubmitAskUserAnswer, encodeSecretAnswer, parseAskUserQuestions,
  type AskUserAnswers, type QuestionItem,
} from "./askUserQuestionParse";
import {
  isQuestionAnswered, readQuestionDraft, saveQuestionDraft, type QuestionDraft,
} from "./interactionState";

export type { AskUserAnswers };
const OTHER_VALUE = "__other__";

function questionChoiceOptions(q: QuestionItem) {
  return [
    ...q.options.map((opt) => ({
      value: opt.label,
      label: <span className="radio-option-label">{opt.label}{opt.description && <small className="radio-desc">{opt.description}</small>}</span>,
    })),
    { value: OTHER_VALUE, label: <span className="radio-option-label">其他<small className="radio-desc">自行输入</small></span> },
  ];
}

interface Props {
  msg: ChatMsg;
  sessionId: string;
  onAnswer: (answerId: string, answers: AskUserAnswers) => void | boolean | Promise<void | boolean>;
  submitting?: boolean;
}

export default function AskUserQuestionCard({ msg, sessionId, onAnswer, submitting = false }: Props) {
  const questions = useMemo(() => parseAskUserQuestions(msg), [msg.toolArgs, msg.toolName]);
  const [draft, setDraft] = useState(() => readQuestionDraft(sessionId, msg.id));
  const [secretText, setSecretText] = useState<Record<string, string>>({});
  const [useDefaultSecret, setUseDefaultSecret] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const submitLock = useRef(false);
  const headingId = useId();
  const answerReady = canSubmitAskUserAnswer(msg);
  const disabled = submitting || submitted || !answerReady;
  const page = Math.min(draft.page, Math.max(0, questions.length - 1));
  const q = questions[page];
  const lastPage = page === questions.length - 1;

  const updateDraft = (patch: Partial<QuestionDraft>) => {
    const next = { ...draft, ...patch };
    saveQuestionDraft(sessionId, msg.id, next);
    setDraft(next);
  };
  const answered = (question: QuestionItem) => question.secret
    ? !!((question.secretDefaultLabel && useDefaultSecret[question.question]) || secretText[question.question]?.length)
    : isQuestionAnswered(question, draft);
  const canSubmit = answerReady && questions.length > 0 && questions.every(answered);

  const handleSubmit = async () => {
    if (!msg.toolApprovalId || !canSubmit || disabled || submitLock.current) return;
    submitLock.current = true;
    setSubmitted(true);
    const answers: AskUserAnswers = {};
    for (const question of questions) {
      const text = draft.otherText[question.question]?.trim() || "";
      if (question.secret) {
        answers[question.question] = encodeSecretAnswer(question, secretText[question.question] || "", useDefaultSecret[question.question] === true);
      } else if (!question.options.length || draft.otherSelected[question.question]) {
        const picks = question.multiSelect ? (draft.selected[question.question] || []) : [];
        answers[question.question] = [...picks, text].filter(Boolean).join(", ");
      } else {
        answers[question.question] = (draft.selected[question.question] || []).join(", ");
      }
    }
    try {
      const ok = await onAnswer(msg.toolApprovalId, answers);
      if (ok === false) setSubmitted(false);
      else setSecretText({});
    } catch {
      setSubmitted(false);
    } finally {
      submitLock.current = false;
    }
  };
  const advance = () => {
    if (!q || disabled || !answered(q)) return;
    if (lastPage) void handleSubmit();
    else updateDraft({ page: page + 1 });
  };

  return (
    <div className="agent-tool-ask" data-tool-approval-id={msg.toolApprovalId ?? undefined}>
      <div className="agent-tool-ask-body">
        {!q ? <p className="agent-tool-permission-empty">正在等待模型返回问题…</p> : (
          <div className="agent-tool-ask-question" role="group" aria-labelledby={headingId}>
            {questions.length > 1 && <div className="agent-tool-ask-progress" aria-live="polite">问题 {page + 1} / {questions.length}</div>}
            <div id={headingId} className="agent-tool-ask-question-text">{q.question}</div>
            {q.secret ? (
              <>
                {q.secretDefaultLabel && <Radio direction="vertical" disabled={disabled}
                  value={useDefaultSecret[q.question] ? "connection" : "manual"}
                  options={[{ value: "manual", label: "手动输入密码" }, { value: "connection", label: q.secretDefaultLabel }]}
                  onChange={(next) => {
                    const useDefault = next === "connection";
                    setUseDefaultSecret((prev) => ({ ...prev, [q.question]: useDefault }));
                    if (useDefault) setSecretText((prev) => ({ ...prev, [q.question]: "" }));
                  }} />}
                {!useDefaultSecret[q.question] && <Input className="agent-tool-ask-other-input" type="password"
                  aria-label={q.question} autoComplete="off" value={secretText[q.question] || ""} disabled={disabled}
                  placeholder="输入密码（不会显示明文）…"
                  onChange={(e) => setSecretText((prev) => ({ ...prev, [q.question]: e.target.value }))} />}
              </>
            ) : (
              <>
                {q.options.length > 0 && (q.multiSelect ? (
                  <Checkbox direction="vertical" disabled={disabled}
                    value={[...(draft.selected[q.question] || []), ...(draft.otherSelected[q.question] ? [OTHER_VALUE] : [])]}
                    options={questionChoiceOptions(q)}
                    onChange={(values) => updateDraft({
                      otherSelected: { ...draft.otherSelected, [q.question]: values.includes(OTHER_VALUE) },
                      selected: { ...draft.selected, [q.question]: values.filter((v) => v !== OTHER_VALUE) },
                    })} />
                ) : (
                  <Radio direction="vertical" disabled={disabled}
                    value={draft.otherSelected[q.question] ? OTHER_VALUE : (draft.selected[q.question]?.[0] ?? "")}
                    options={questionChoiceOptions(q)}
                    onChange={(value) => updateDraft({
                      otherSelected: { ...draft.otherSelected, [q.question]: value === OTHER_VALUE },
                      selected: { ...draft.selected, [q.question]: value === OTHER_VALUE ? [] : [value] },
                    })} />
                ))}
                {(!q.options.length || draft.otherSelected[q.question]) && <Input
                  className="agent-tool-ask-other-input" type="text" aria-label={q.question}
                  value={draft.otherText[q.question] || ""} disabled={disabled} placeholder="请输入你的回答…"
                  onChange={(e) => updateDraft({ otherText: { ...draft.otherText, [q.question]: e.target.value } })} />}
              </>
            )}
          </div>
        )}
      </div>
      <div className="agent-tool-ask-actions">
        {page > 0 && <Button variant="outline" size="sm" disabled={disabled} onClick={() => updateDraft({ page: page - 1 })}>上一题</Button>}
        <Button variant="default" size="sm" disabled={disabled || !q || (lastPage ? !canSubmit : !answered(q))} onClick={advance}>
          {submitted || submitting ? "提交中…" : !answerReady ? "等待工具就绪…" : lastPage ? "提交回答" : "下一题"}
        </Button>
      </div>
    </div>
  );
}
