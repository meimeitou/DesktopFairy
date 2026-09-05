import { describe, it, expect } from "vitest";
import {
  DEFAULT_TERMINAL_FONT_FAMILY,
  DEFAULT_TERMINAL_SETTINGS,
  normalizeTerminalSettings,
} from "./terminalSettings";

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
