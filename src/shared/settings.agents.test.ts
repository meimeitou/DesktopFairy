import { describe, it, expect } from "vitest";
import { finalizeSettings, DEFAULT_SETTINGS } from "./settings";
import {
  PERSONAL_ASSISTANT_ID,
  TERMINAL_ASSISTANT_ID,
  HOST_ASSISTANT_ID,
  findAgentById,
  createPersonalAssistantDefaults,
  DEFAULT_SOUL,
  PREVIOUS_PERSONAL_SOULS,
} from "./agent";
import type { AppSettings } from "./settings";

/** Legacy v? settings shape: single `agent` object + top-level chatMode; no `agents` array. */
function legacySettings(legacyAgent: Record<string, unknown>): AppSettings {
  const { agents, ...rest } = DEFAULT_SETTINGS;
  void agents;
  return {
    ...rest,
    agent: legacyAgent,
    chatMode: "auto-edit",
    activeChatAgentId: undefined as unknown as string,
    terminalAgentId: undefined as unknown as string,
  } as AppSettings;
}

describe("settings agents migration (finalizeSettings)", () => {
  it("upgrades the shipped personal soul and keeps an edited one", () => {
    const upgraded = finalizeSettings({
      ...DEFAULT_SETTINGS,
      agents: [createPersonalAssistantDefaults({ soul: PREVIOUS_PERSONAL_SOULS[0] }), createPersonalAssistantDefaults({ id: "custom", builtinRole: undefined, soul: "我改过的小雅" })],
    });
    expect(findAgentById(upgraded.agents, PERSONAL_ASSISTANT_ID)?.soul).toBe(DEFAULT_SOUL);
    expect(findAgentById(upgraded.agents, "custom")?.soul).toBe("我改过的小雅");
  });

  it("migrates legacy settings.agent into two builtin agents", () => {
    const next = finalizeSettings(
      legacySettings({
        soul: "旧灵魂",
        user: "老用户",
        providerId: "openai",
        modelName: "gpt-4o-mini",
        disabledToolIds: ["Terminal", "WebSearch"],
        mcpServerIds: ["mcp_1"],
        enabledSkillIds: ["find-skills"],
        maxTurns: 55,
        envVars: { FOO: "bar" },
        chatMode: "plan",
      }),
    );

    expect((next as Record<string, unknown>).agent).toBeUndefined();
    expect((next as Record<string, unknown>).chatMode).toBeUndefined();

    const personal = findAgentById(next.agents, PERSONAL_ASSISTANT_ID);
    const terminal = findAgentById(next.agents, TERMINAL_ASSISTANT_ID);
    expect(personal).toBeDefined();
    expect(terminal).toBeDefined();
    expect(next.agents).toHaveLength(2);
    const host = findAgentById(next.agents, HOST_ASSISTANT_ID);
    expect(host).toBeUndefined();

    // Personal assistant inherits the legacy agent config.
    expect(personal?.soul).toBe("旧灵魂");
    expect(personal?.user).toBe("老用户");
    expect(personal?.modelName).toBe("gpt-4o-mini");
    expect(personal?.disabledToolIds).toEqual(["Terminal", "WebSearch"]);
    expect(personal?.mcpServerIds).toEqual(["mcp_1"]);
    expect(personal?.enabledSkillIds).toEqual(["find-skills"]);
    expect(personal?.maxTurns).toBe(55);
    expect(personal?.envVars).toEqual({ FOO: "bar" });
    expect(personal?.chatMode).toBe("plan");

    // Terminal assistant gets model defaults, not the personal disabled set.
    expect(terminal?.modelName).toBe("gpt-4o-mini");
    expect(terminal?.disabledToolIds).not.toContain("WebSearch");

    expect(next.terminalAgentId).toBe(TERMINAL_ASSISTANT_ID);
    expect(next.activeChatAgentId).toBe(PERSONAL_ASSISTANT_ID);
  });

  it("agents present: keeps them, backfills terminal assistant, dedupes by id", () => {
    const custom = { ...createPersonalAssistantDefaults(), id: "custom-1", builtinRole: undefined };
    const next = finalizeSettings({
      ...DEFAULT_SETTINGS,
      agents: [custom, custom],
      terminalAgentId: "gone-away",
      activeChatAgentId: "custom-1",
    });

    const ids = next.agents.map((a) => a.id);
    expect(ids).toContain("custom-1");
    expect(ids.filter((id) => id === "custom-1")).toHaveLength(1);
    // 个人助手可删：不再强制补回；终端助手仍恒存在（终端页依赖）。
    expect(ids).not.toContain(PERSONAL_ASSISTANT_ID);
    expect(ids).toContain(TERMINAL_ASSISTANT_ID);
    // terminalAgentId falls back to the builtin terminal assistant.
    expect(next.terminalAgentId).toBe(TERMINAL_ASSISTANT_ID);
    expect(next.activeChatAgentId).toBe("custom-1");
  });

  it("legacy agent migrates even when DEFAULT_SETTINGS fields are spread in", () => {
    // migrateFromLegacy builds base = {...DEFAULT_SETTINGS, ...parsed};
    // this regression-tests that the default `agents` array never masks
    // a legacy `agent` object.
    const parsed = { agent: { soul: "旧灵魂", chatMode: "full-auto" } };
    const next = finalizeSettings({
      ...DEFAULT_SETTINGS,
      ...parsed,
      // simulate the DEFAULT_SETTINGS.agents strip in migrateFromLegacy
      agents: undefined as unknown as AppSettings["agents"],
    });
    const personal = findAgentById(next.agents, PERSONAL_ASSISTANT_ID);
    expect(personal?.soul).toBe("旧灵魂");
    expect(personal?.chatMode).toBe("full-auto");
  });

  it("activeChatAgentId pointing at the terminal agent falls back to personal", () => {
    const next = finalizeSettings({
      ...DEFAULT_SETTINGS,
      activeChatAgentId: TERMINAL_ASSISTANT_ID,
    });
    expect(next.activeChatAgentId).toBe(PERSONAL_ASSISTANT_ID);
  });

  it("corrupt raw agent fields do not survive via the raw-as-fallback path", () => {
    const next = finalizeSettings({
      ...DEFAULT_SETTINGS,
      agents: [
        {
          ...createPersonalAssistantDefaults(),
          envVars: "not-an-object",
          soul: 42,
          maxTurns: "many",
        },
      ],
    });
    const personal = findAgentById(next.agents, PERSONAL_ASSISTANT_ID);
    expect(personal?.envVars).toEqual({});
    expect(typeof personal?.soul).toBe("string");
    expect(personal?.maxTurns).toBe(30);
  });
});
