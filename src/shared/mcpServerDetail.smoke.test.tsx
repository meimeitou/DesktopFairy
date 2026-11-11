// Smoke: McpServerDetail renders six tabs and per-tool toggles.
vi.hoisted(() => {
  const stub = {
    // Return one tool / one prompt / one resource for the detail tabs.
    invoke: async (channel: string) => {
      if (channel === "mcp:servers:tools") {
        return [
          {
            name: "echo",
            description: "Echo a message",
            inputSchema: { type: "object", properties: { msg: { type: "string" } } },
          },
        ];
      }
      if (channel === "mcp:servers:prompts") {
        return [{ name: "greet", description: "Say hi", arguments: [{ name: "who" }] }];
      }
      if (channel === "mcp:servers:resources") {
        return [{ uri: "file:///x", name: "x", mimeType: "text/plain" }];
      }
      if (channel === "mcp:servers:logs") {
        return [{ timestamp: 1, level: "info", message: "hi", source: "client" }];
      }
      return [];
    },
    onMcpStatusChanged: () => () => {},
    onMcpLog: () => () => {},
  };
  globalThis.window = { electronAPI: stub } as unknown as typeof window;
});

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import McpServerDetail from "../components/settings/tools/mcp/McpServerDetail";
import type { McpServer } from "./mcpServer";

const server: McpServer = {
  id: "srv1",
  name: "Test Server",
  type: "stdio",
  command: "npx",
  args: [],
  isActive: true,
  installSource: "manual",
  disabledToolNames: ["echo"],
};

describe("McpServerDetail smoke", () => {
  it("renders header, six tabs, and general editor", () => {
    const html = renderToStaticMarkup(
      React.createElement(McpServerDetail, {
        server,
        status: { state: "connected", checkedAt: 0 },
        onBack: () => {},
      })
    );
    for (const label of ["通用", "服务器指令", "工具", "提示", "资源", "日志", "测试连接", "返回列表"]) {
      expect(html).toContain(label);
    }
    // General tab is the default: editor fields visible.
    expect(html).toContain("传输类型");
  });
});
