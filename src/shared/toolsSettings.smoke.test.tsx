// Throwaway smoke test (deleted after verification): tools settings sections render.
// vi.hoisted runs before ES module imports; components read window.electronAPI at top level.
vi.hoisted(() => {
  const stub = {
    invoke: async () => [],
    onMcpStatusChanged: () => () => {},
    onMcpLog: () => () => {},
  };
  globalThis.window = { electronAPI: stub } as unknown as typeof window;
});

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import ToolsSettingsSection from "../components/settings/tools/ToolsSettingsSection";
import AgentToolsSection from "../components/settings/agent/AgentToolsSection";
import AgentSkillsSection from "../components/settings/agent/AgentSkillsSection";
import { DEFAULT_SETTINGS } from "./settings";
import { createPersonalAssistantDefaults } from "./agent";

describe("tools settings smoke", () => {
  it("ToolsSettingsSection renders MCP/skills subnav with new props", () => {
    const html = renderToStaticMarkup(
      React.createElement(ToolsSettingsSection, {
        settings: { ...DEFAULT_SETTINGS, providers: [] as never },
      })
    );
    expect(html).toContain("MCP 服务器");
    expect(html).toContain("技能");
    expect(html).toContain("正在加载 MCP 服务器");
  });

  it("AgentToolsSection mcp panel renders as pure binding list", () => {
    const html = renderToStaticMarkup(
      React.createElement(AgentToolsSection, {
        panel: "mcp",
        agent: createPersonalAssistantDefaults({ id: "test-agent", builtinRole: undefined }),
        onAgentChange: () => {},
      })
    );
    expect(html).toContain("正在加载 MCP 服务器");
    expect(html).not.toContain("内置预设");
    expect(html).not.toContain("+ 自定义");
  });

  it("AgentToolsSection builtin panel shows context-forced badges", () => {
    const html = renderToStaticMarkup(
      React.createElement(AgentToolsSection, {
        panel: "builtin",
        agent: createPersonalAssistantDefaults({ id: "test-agent", builtinRole: undefined }),
        onAgentChange: () => {},
        context: "local",
      })
    );
    // local context forces Terminal off with a badge instead of a switch.
    expect(html).toContain("场景强制");
  });

  it("AgentSkillsSection slimmed to enable toggles", () => {
    const html = renderToStaticMarkup(
      React.createElement(AgentSkillsSection, {
        agent: createPersonalAssistantDefaults({ id: "test-agent", builtinRole: undefined }),
        onChange: () => {},
      })
    );
    expect(html).not.toContain("导入本地技能");
    expect(html).not.toContain("打开目录");
    expect(html).toContain("正在扫描技能");
  });
});
