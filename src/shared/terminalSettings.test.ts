import { describe, it, expect } from "vitest";
import {
  DEFAULT_TERMINAL_FONT_FAMILY,
  DEFAULT_TERMINAL_SETTINGS,
  normalizeTerminalSettings,
  resolveSshRecentTarget,
  type SshHost,
  type SshRecentEntry,
} from "./terminalSettings";

function host(partial: Partial<SshHost> & Pick<SshHost, "id" | "host">): SshHost {
  return {
    name: partial.name ?? partial.host,
    port: 22,
    user: "root",
    authMethod: "auto",
    ...partial,
  };
}

function entry(h: SshHost): SshRecentEntry {
  return { host: h, connectedAt: 1 };
}

describe("normalizeTerminalSettings", () => {
  it("uses a CJK and emoji font fallback stack by default", () => {
    expect(DEFAULT_TERMINAL_FONT_FAMILY).toContain("PingFang SC");
    expect(DEFAULT_TERMINAL_FONT_FAMILY).toContain("Apple Color Emoji");
    expect(DEFAULT_TERMINAL_SETTINGS.fontFamily).toBe(DEFAULT_TERMINAL_FONT_FAMILY);
  });

  it("migrates the legacy latin-only font stack", () => {
    const settings = normalizeTerminalSettings({
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    });
    expect(settings.fontFamily).toBe(DEFAULT_TERMINAL_FONT_FAMILY);
  });

  it("keeps a custom font family", () => {
    const settings = normalizeTerminalSettings({
      fontFamily: "JetBrains Mono, monospace",
    });
    expect(settings.fontFamily).toBe("JetBrains Mono, monospace");
  });

  it("falls back to default when font family is empty", () => {
    expect(normalizeTerminalSettings({ fontFamily: "  " }).fontFamily).toBe(
      DEFAULT_TERMINAL_FONT_FAMILY,
    );
  });
});

describe("resolveSshRecentTarget", () => {
  it("uses the saved host when ids match", () => {
    const saved = host({ id: "h1", host: "a.example", user: "deploy", port: 2222 });
    const snap = host({ id: "h1", host: "a.example", user: "root", port: 22 });
    expect(resolveSshRecentTarget(entry(snap), [saved])).toEqual({
      type: "saved",
      id: "h1",
    });
  });

  it("falls back to user@host:port when the saved id changed", () => {
    const saved = host({ id: "new", host: "a.example", user: "root", port: 22 });
    const snap = host({ id: "old", host: "a.example", user: "root", port: 22 });
    expect(resolveSshRecentTarget(entry(snap), [saved])).toEqual({
      type: "saved",
      id: "new",
    });
  });

  it("uses the snapshot when the host is no longer saved", () => {
    const snap = host({ id: "gone", host: "b.example", user: "root", port: 22 });
    expect(resolveSshRecentTarget(entry(snap), [])).toEqual({
      type: "snapshot",
      host: snap,
    });
  });
});
