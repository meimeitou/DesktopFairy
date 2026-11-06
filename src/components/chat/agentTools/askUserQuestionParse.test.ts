import { describe, expect, it } from "vitest";
import { encodeSecretAnswer, parseAskUserQuestions } from "./askUserQuestionParse";
import type { ChatMsg } from "../../../shared/chatMessages";

function askMsg(toolArgs: string, overrides: Partial<ChatMsg> = {}): ChatMsg {
  return {
    id: "t1",
    role: "assistant",
    type: "tool",
    content: "",
    toolName: "AskUserQuestion",
    toolArgs,
    ...overrides,
  };
}

describe("parseAskUserQuestions", () => {
  it("accepts string options", () => {
    const questions = parseAskUserQuestions(
      askMsg(
        JSON.stringify({
          questions: [
            {
              question: "Pick one?",
              options: ["A", "B"],
            },
          ],
        }),
      ),
    );
    expect(questions).toHaveLength(1);
    expect(questions[0].options.map((o) => o.label)).toEqual(["A", "B"]);
  });

  it("accepts a single preset option plus Other in UI", () => {
    const questions = parseAskUserQuestions(
      askMsg(
        JSON.stringify({
          questions: [{ question: "Only one?", options: [{ label: "Yes" }] }],
        }),
      ),
    );
    expect(questions).toHaveLength(1);
    expect(questions[0].options).toHaveLength(1);
  });

  it("encodes a password source explicitly and preserves manual passwords verbatim", () => {
    const [question] = parseAskUserQuestions(askMsg(JSON.stringify({ questions: [{
      question: "sudo 密码", secret: true, secretDefaultLabel: "使用已保存密码", options: [],
    }] })));
    const password = ' {"source":"connection"} ';
    expect(JSON.parse(encodeSecretAnswer(question, password, false))).toEqual({ source: "manual", password });
    expect(JSON.parse(encodeSecretAnswer(question, "", true))).toEqual({ source: "connection" });
    expect(encodeSecretAnswer({ ...question, secretDefaultLabel: undefined }, password, false)).toBe(password);
  });
});
