// vi.hoisted runs before ES module imports; AgentMcpEditor/AgentToolsSection
// read `window.electronAPI` at module top level, and node env has no window.
vi.hoisted(() => {
  const stub = {
    invoke: async () => [],
    onMcpStatusChanged: () => () => {},
  };
  // Unchecked cast: minimal window shape for node-env SSR test.
  globalThis.window = { electronAPI: stub } as unknown as typeof window;
});

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AgentToolsSection from "./AgentToolsSection";
import { DEFAULT_AGENT_CONFIG, type AgentConfig } from "../../../shared/agent";

const baseAgent: AgentConfig = {
  ...DEFAULT_AGENT_CONFIG,
  disabledToolIds: ["Terminal"],
  terminalDisabledToolIds: ["bash", "read", "write", "edit", "glob", "grep"],
};

function renderAskRow(agent: AgentConfig): string {
  const html = renderToStaticMarkup(
    <AgentToolsSection panel="builtin" agent={agent} onAgentChange={() => {}} />
  );
  const rowStart = html.indexOf("AskUserQuestion");
  return html.slice(rowStart, html.indexOf("</li>", rowStart));
}

function switchStates(rowHtml: string) {
  const switches = [...rowHtml.matchAll(/aria-checked="([^"]+)"/g)].map((m) => m[1]);
  const disabled = /aria-disabled="true"|disabled[ =]/.test(rowHtml);
  return { switches, disabled };
}

describe("AgentToolsSection builtin panel switches", () => {
  it("shows AskUserQuestion ON (local) and ON (terminal) in normal mode", () => {
    const { switches, disabled } = switchStates(
      renderAskRow({ ...baseAgent, chatMode: "normal" })
    );
    expect(switches).toEqual(["true", "true"]);
    expect(disabled).toBe(false);
  });

  it("shows AskUserQuestion ON (disabled, mode-gated) in full-auto mode", () => {
    const { switches, disabled } = switchStates(
      renderAskRow({ ...baseAgent, chatMode: "full-auto" })
    );
    // Config-level always-on: displayed ON even though full-auto gates it at runtime.
    expect(switches).toEqual(["true", "true"]);
    expect(disabled).toBe(true);
  });

  it("shows AskUserQuestion ON in plan and auto-edit modes", () => {
    for (const chatMode of ["plan", "auto-edit"] as const) {
      const { switches } = switchStates(renderAskRow({ ...baseAgent, chatMode }));
      expect(switches).toEqual(["true", "true"]);
    }
  });
});
