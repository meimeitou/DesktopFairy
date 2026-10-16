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
import {
  createPersonalAssistantDefaults,
  type AgentConfig,
} from "../../../shared/agent";

const baseAgent: AgentConfig = createPersonalAssistantDefaults({
  id: "test-agent",
  builtinRole: undefined,
});

/** Tool rows render as `<li><div class="agent-toggle-main">…<strong>{name}</strong>…`.
 * Tool name === tool id, but the HintTip text mentions ids too, so anchor on
 * the <strong> title row instead of a bare indexOf. */
function renderRow(agent: AgentConfig, context: "local" | "terminal", toolId: string): string {
  const html = renderToStaticMarkup(
    <AgentToolsSection
      panel="builtin"
      agent={agent}
      onAgentChange={() => {}}
      context={context}
    />
  );
  const anchor = `<strong>${toolId}</strong>`;
  const rowStart = html.indexOf(anchor);
  expect(rowStart, `tool row for ${toolId} should render`).toBeGreaterThan(-1);
  return html.slice(rowStart, html.indexOf("</li>", rowStart));
}

function switchStates(rowHtml: string) {
  const switches = [...rowHtml.matchAll(/aria-checked="([^"]+)"/g)].map((m) => m[1]);
  const disabled = /aria-disabled="true"|disabled[ =]/.test(rowHtml);
  const forcedBadge = /场景强制/.test(rowHtml);
  return { switches, disabled, forcedBadge };
}

describe("AgentToolsSection builtin panel switches", () => {
  it("local context: Terminal row is forced off, no switch", () => {
    const { switches, forcedBadge } = switchStates(
      renderRow(baseAgent, "local", "Terminal")
    );
    expect(forcedBadge).toBe(true);
    expect(switches).toEqual([]);
  });

  it("terminal context: bash row is forced off, no switch", () => {
    const { switches, forcedBadge } = switchStates(
      renderRow(baseAgent, "terminal", "bash")
    );
    expect(forcedBadge).toBe(true);
    expect(switches).toEqual([]);
  });

  it("AskUserQuestion is ON and interactive in normal mode (both contexts)", () => {
    for (const context of ["local", "terminal"] as const) {
      const { switches, disabled } = switchStates(
        renderRow(baseAgent, context, "AskUserQuestion")
      );
      expect(switches).toEqual(["true"]);
      expect(disabled).toBe(false);
    }
  });

  it("AskUserQuestion shows OFF in full-auto (runtime-gated off)", () => {
    const { switches } = switchStates(
      renderRow({ ...baseAgent, chatMode: "full-auto" }, "local", "AskUserQuestion")
    );
    expect(switches).toEqual(["false"]);
  });

  it("editable tool reflects disabledToolIds in local context", () => {
    const off = switchStates(
      renderRow(
        { ...baseAgent, disabledToolIds: ["Terminal", "WebSearch"] },
        "local",
        "WebSearch"
      )
    );
    expect(off.switches).toEqual(["false"]);

    const on = switchStates(renderRow(baseAgent, "local", "WebSearch"));
    expect(on.switches).toEqual(["true"]);
  });

  it("Terminal tool reflects disabledToolIds in terminal context", () => {
    const { switches, forcedBadge } = switchStates(
      renderRow(baseAgent, "terminal", "Terminal")
    );
    // baseAgent is a personal assistant: Terminal stays disabled by default.
    expect(forcedBadge).toBe(false);
    expect(switches).toEqual(["false"]);

    const enabled = switchStates(
      renderRow({ ...baseAgent, disabledToolIds: [] }, "terminal", "Terminal")
    );
    expect(enabled.switches).toEqual(["true"]);
  });
});
