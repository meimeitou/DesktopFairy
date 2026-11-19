import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { createChatTopic } from "./chatSession";
import { resolveKnowledgeBaseIds } from "./knowledgeSelection";

const require = createRequire(import.meta.url);
const { getBuiltinTools } = require("../../electron/ai/agentStreamShared.cjs");
const { buildAgentSystemPrompt } = require("../../electron/agentService.cjs");
const agent = { disabledToolIds: [], chatMode: "normal", mcpServerIds: [], enabledSkillIds: [], knowledgeBaseIds: ["ops"] };

describe("knowledge selection to agent tools", () => {
  it.each(["local", "terminal", "host", "terminal-local"])("exposes retrieval in an older %s conversation after configuring the agent", (context) => {
    const oldTopic = createChatTopic("old-topic");
    const ids = resolveKnowledgeBaseIds(oldTopic.knowledgeBaseIds, agent.knowledgeBaseIds);
    const names = getBuiltinTools(agent, context, ids).map((tool: { function: { name: string } }) => tool.function.name);
    expect(names).toEqual(expect.arrayContaining(["kb_search", "kb_read", "kb_resolve_link"]));
    const prompt = buildAgentSystemPrompt(agent, context, null, names, [], null, [{ id: "ops", name: "运维手册" }]);
    expect(prompt).toContain("运维手册");
    expect(prompt).toContain("主动调用 kb_search");
    expect(oldTopic.knowledgeBaseIds).toBeUndefined();
  });

  it("keeps an explicit deselection tool-free even when the agent has knowledge bases", () => {
    const ids = resolveKnowledgeBaseIds([], agent.knowledgeBaseIds);
    const names = getBuiltinTools(agent, "local", ids).map((tool: { function: { name: string } }) => tool.function.name);
    expect(names).not.toContain("kb_search");
    expect(buildAgentSystemPrompt(agent, "local", null, names)).not.toContain("## 本地知识库");
    expect(agent.knowledgeBaseIds).toEqual(["ops"]);
  });
});
