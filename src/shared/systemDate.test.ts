import { describe, it, expect } from "vitest";
import {
  formatSystemDateLine,
  prependSystemDate,
} from "../../electron/systemDate.cjs";

describe("formatSystemDateLine", () => {
  it("formats local calendar date with weekday and timezone", () => {
    const line = formatSystemDateLine(new Date(2026, 8, 7, 15, 0, 0));
    expect(line).toMatch(
      /^当前系统日期：2026年9月7日星期一（UTC[+-]\d+(?::\d{2})?）$/,
    );
  });
});

describe("prependSystemDate", () => {
  it("adds a system message when history has none", () => {
    const out = prependSystemDate(
      [{ role: "user", content: "hi" }],
      new Date(2026, 8, 7),
    );
    expect(out[0].role).toBe("system");
    expect(out[0].content).toMatch(/^当前系统日期：2026年9月7日星期一/);
    expect(out[1]).toEqual({ role: "user", content: "hi" });
  });

  it("prefixes an existing system message", () => {
    const out = prependSystemDate(
      [{ role: "system", content: "kb hits" }],
      new Date(2026, 8, 7),
    );
    expect(out).toHaveLength(1);
    expect(out[0].content.startsWith("当前系统日期：")).toBe(true);
    expect(out[0].content.endsWith("kb hits")).toBe(true);
  });
});
