import type { ChatMsg } from "../../../shared/chatMessages";
import { getToolInput } from "./toolUtils";

export type AskUserAnswers = Record<string, string>;

export interface QuestionOption {
  label: string;
  description?: string;
}

export interface QuestionItem {
  question: string;
  header?: string;
  multiSelect?: boolean;
  options: QuestionOption[];
}

function normalizeOption(opt: unknown): QuestionOption | null {
  if (typeof opt === "string") {
    const label = opt.trim();
    return label ? { label } : null;
  }
  if (!opt || typeof opt !== "object") return null;
  const o = opt as Record<string, unknown>;
  const labelRaw = o.label ?? o.text ?? o.value ?? o.name ?? o.title;
  if (typeof labelRaw !== "string" || !labelRaw.trim()) return null;
  const description =
    typeof o.description === "string"
      ? o.description
      : typeof o.detail === "string"
        ? o.detail
        : undefined;
  return { label: labelRaw.trim(), description };
}

export function parseAskUserQuestions(msg: ChatMsg): QuestionItem[] {
  const input = getToolInput(msg.toolName || "AskUserQuestion", msg.toolArgs);
  const raw = input.questions;
  if (!Array.isArray(raw)) return [];
  const out: QuestionItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const q = item as Record<string, unknown>;
    const question = typeof q.question === "string" ? q.question.trim() : "";
    if (!question) continue;
    const optionsRaw = Array.isArray(q.options) ? q.options : [];
    const options: QuestionOption[] = [];
    for (const opt of optionsRaw) {
      const normalized = normalizeOption(opt);
      if (normalized) options.push(normalized);
    }
    out.push({
      question,
      header: typeof q.header === "string" ? q.header : undefined,
      multiSelect: q.multiSelect === true,
      options,
    });
  }
  return out;
}

export function isAskUserQuestionMsg(msg: ChatMsg): boolean {
  return msg.toolName === "AskUserQuestion";
}

/** Interactive states that should render the answer card (not the collapsed tool renderer). */
export function isAskUserQuestionInteractive(msg: ChatMsg): boolean {
  if (!isAskUserQuestionMsg(msg)) return false;
  const status = msg.toolStatus || "streaming";
  return (
    status === "awaiting_input" ||
    status === "streaming" ||
    status === "running"
  );
}

export function canSubmitAskUserAnswer(msg: ChatMsg): boolean {
  return (
    isAskUserQuestionMsg(msg) &&
    msg.toolStatus === "awaiting_input" &&
    !!msg.toolApprovalId
  );
}
