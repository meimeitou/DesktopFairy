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
import { DEFAULT_AGENT_CONFIG } from "./agent";

describe("tools settings smoke", () => {
  it("ToolsSettingsSection renders MCP/skills subnav", () => {
    const html = renderToStaticMarkup(
      React.createElement(ToolsSettingsSection, {
        settings: { ...DEFAULT_SETTINGS, providers: [] as never },
        onChange: () => {},
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
        agent: { ...DEFAULT_AGENT_CONFIG },
        onAgentChange: () => {},
      })
    );
    expect(html).toContain("正在加载 MCP 服务器");
    expect(html).not.toContain("内置预设");
    expect(html).not.toContain("+ 自定义");
  });

  it("AgentSkillsSection slimmed to enable toggles", () => {
    const html = renderToStaticMarkup(
      React.createElement(AgentSkillsSection, {
        agent: { ...DEFAULT_AGENT_CONFIG },
        onChange: () => {},
      })
    );
    expect(html).not.toContain("导入本地技能");
    expect(html).not.toContain("打开目录");
    expect(html).toContain("正在扫描技能");
  });
});
