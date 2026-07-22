import { describe, expect, it } from "vitest";
import { parseAskUserQuestions } from "./askUserQuestionParse";
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
});
