import { describe, expect, it } from "vitest";
import { addSelectedSkill, prepareSkillInvocation, rankSkillCommands, removeSkillQuery, skillHistoryText, skillQueryAt, skillRawText } from "./skillInvocation";
import { buildSkillCommands, getBuiltinCommands } from "./slashCommands";
import { acceptSendDraft, beginSend, emptyAgentSessionState } from "./agentSession";
import { buildChatSession, normalizeChatSession } from "./chatSession";

describe("skill selection", () => {
  it("recognizes leading slash and word-start mentions at the caret", () => {
    expect(skillQueryAt("  /review", 9)).toMatchObject({ trigger: "/", query: "review", start: 2, end: 9 });
    expect(skillQueryAt("请用 @rev 完成任务", 7)).toMatchObject({ trigger: "@", query: "rev", start: 3, end: 7 });
    expect(skillQueryAt("任务\n@", 4)?.query).toBe("");
    for (const input of ["yin@example.com", "foo /bar", "/usr/bin", "任务\n/review", "任务@review"]) {
      expect(skillQueryAt(input, input.length)).toBeNull();
    }
  });

  it("replaces only the trigger range and deduplicates selected skills", () => {
    const input = "请用 @rev 完成任务";
    expect(removeSkillQuery(input, skillQueryAt(input, 7)!)).toBe("请用  完成任务");
    expect(removeSkillQuery("请用 @review 完成任务", skillQueryAt("请用 @review 完成任务", 7)!)).toBe("请用  完成任务");
    expect(addSelectedSkill(["review"], "review")).toEqual(["review"]);
    expect(addSelectedSkill(["review"], "pdf")).toEqual(["review", "pdf"]);
  });

  const commands = [...getBuiltinCommands(), ...buildSkillCommands([
    { id: "a", name: "写作", description: "review docs", folderName: "a" },
    { id: "review-more", name: "其他", description: "检查", folderName: "review-more" },
    { id: "review", name: "代码审查", description: "检查代码", folderName: "review" },
  ], ["a"])];

  it("filters mentions to skills, searches Chinese and ranks exact then prefix then description", () => {
    const query = skillQueryAt("@review", 7)!;
    expect(rankSkillCommands(commands, query).map((c) => c.id)).toEqual(["review", "review-more", "a"]);
    expect(rankSkillCommands(commands, skillQueryAt("@", 1)!)[0].id).toBe("a");
    expect(rankSkillCommands(commands, skillQueryAt("@审查", 3)!)[0].id).toBe("review");
    expect(rankSkillCommands(commands, skillQueryAt("/clear", 6)!)[0].group).toBe("builtin");
  });

  it("converts legacy slash invocations without model-load instructions or duplicate history prefixes", () => {
    const invocation = prepareSkillInvocation("/review 检查代码", ["pdf"], ["review", "pdf"]);
    expect(invocation).toEqual({ rawText: "检查代码", selectedSkillIds: ["pdf", "review"], text: "@pdf @review\n检查代码" });
    expect(prepareSkillInvocation(invocation.text, invocation.selectedSkillIds, []).text).toBe(invocation.text);
    expect(prepareSkillInvocation("/review", [], ["review"]).rawText).toBe("");
    expect(prepareSkillInvocation("/clear", [], ["clear"]).selectedSkillIds).toEqual([]);
    expect(skillRawText("提到 @review", ["review"])).toBe("提到 @review");
  });

  it("preserves skill drafts until acceptance and round-trips message metadata", () => {
    const draft = { ...emptyAgentSessionState(), input: "检查代码", selectedSkillIds: ["review"] };
    const sending = beginSend(draft, { requestId: "r", userText: skillHistoryText(draft.input, ["review"]), rawText: draft.input, selectedSkillIds: ["review"], keepInput: true });
    expect(sending.input).toBe(draft.input);
    expect(sending.selectedSkillIds).toEqual(["review"]);
    const accepted = acceptSendDraft(sending, false);
    expect(accepted.input).toBe("");
    expect(accepted.selectedSkillIds).toEqual([]);
    expect(acceptSendDraft(sending, true)).toBe(sending);
    const changedDraft = { ...sending, input: "发送期间新输入的草稿" };
    expect(acceptSendDraft(changedDraft, false, draft)).toBe(changedDraft);
    const changedSkills = { ...sending, selectedSkillIds: ["pdf"] };
    expect(acceptSendDraft(changedSkills, false, draft)).toBe(changedSkills);
    const restored = normalizeChatSession(buildChatSession(accepted.messages, "草稿", [], undefined, ["pdf"]));
    expect(restored.messages[0]).toMatchObject({ rawText: "检查代码", selectedSkillIds: ["review"] });
    expect(restored.draftSelectedSkillIds).toEqual(["pdf"]);
    expect(normalizeChatSession({ version: 1, messages: [{ id: "old", role: "user", content: "旧消息" }] }).messages[0].content).toBe("旧消息");
  });
});
