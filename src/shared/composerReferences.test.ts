import { describe, expect, it } from "vitest";
import { hasReferenceTask, hostMention, referenceParts, retainedReferences, withMissingReferences } from "./composerReferences";
import { prepareSkillInvocation } from "./skillInvocation";
import { buildChatSession, normalizeChatSession } from "./chatSession";
import { beginSend, emptyAgentSessionState } from "./agentSession";
const host = { id: "prod", name: "应用服务器", user: "ops", host: "10.0.0.1", port: 22, proxyJump: "" };

describe("inline composer references", () => {
  it("preserves insertion positions through send, retry and session persistence", () => {
    const input = `请用 @review 检查 ${hostMention(host)} 的服务\n再用 @docs 总结`;
    const invocation = prepareSkillInvocation(input, ["review", "docs"], [], [host]);
    expect(invocation.text).toBe(input);
    expect(prepareSkillInvocation(invocation.text, invocation.selectedSkillIds, [], [host]).text).toBe(input);
    const state = beginSend(emptyAgentSessionState(), {
      requestId: "r", userText: invocation.text, rawText: invocation.rawText,
      selectedSkillIds: invocation.selectedSkillIds, selectedHosts: [host],
    });
    const restored = normalizeChatSession(buildChatSession(state.messages, input, [], undefined, ["review", "docs"], [host]));
    expect(restored.messages[0].content).toBe(input);
    expect(restored.draftInput).toBe(input);
    expect(referenceParts(input, ["review", "docs"], [host]).filter((part) => part.reference).map((part) => part.reference!.kind)).toEqual(["skill", "host", "skill"]);
  });
  it("does not infer references from emails or matching prefixes", () => {
    const input = "yin@review.com @review-more @review，完成 @unknown";
    const refs = referenceParts(input, ["review"]);
    expect(refs.filter((part) => part.reference).map((part) => part.text)).toEqual(["@review"]);
    expect(refs.map((part) => part.text).join("")).toBe(input);
  });
  it("removes metadata when its last occurrence is deleted, but retains repeated references", () => {
    expect(retainedReferences("用 @review 检查", ["review", "docs"], [host])).toEqual({ skillIds: ["review"], hosts: [] });
    expect(retainedReferences("检查", ["review"], [host])).toEqual({ skillIds: [], hosts: [] });
    expect(retainedReferences("先 @review 再 @review", ["review"])).toEqual({ skillIds: ["review"], hosts: [] });
    expect(hasReferenceTask(`@review ${hostMention(host)}`, ["review"], [host])).toBe(false);
    expect(hasReferenceTask(`@review ${hostMention(host)} 检查`, ["review"], [host])).toBe(true);
  });
  it("keeps same-name machines distinct and never includes credentials", () => {
    const second = { ...host, id: "staging", host: "10.0.0.2" };
    const input = `${hostMention(host)} 和 ${hostMention(second)}`;
    expect(retainedReferences(input, [], [host, second]).hosts).toEqual([host, second]);
    expect(retainedReferences(hostMention(second), [], [host, second]).hosts).toEqual([second]);
    expect(retainedReferences("@应用服务器", [], [host, second]).hosts).toEqual([]);
  });
  it("restores metadata-only drafts while leaving inline references in place", () => {
    expect(withMissingReferences("用 @review 检查", ["review"])).toBe("用 @review 检查");
    expect(withMissingReferences("检查", ["review"], [host])).toBe(`${hostMention(host)} @review 检查`);
    expect(withMissingReferences("用 @应用服务器 检查", [], [host])).toBe("用 @应用服务器 检查");
  });
});
