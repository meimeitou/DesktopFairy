import { describe, expect, it, vi } from "vitest";
import { measureDropdownSpace } from "./dropdownBounds";

function makeEl(rect: Partial<DOMRect>, parentEl: object | null) {
  return {
    parentElement: parentEl,
    getBoundingClientRect: () => ({ top: 0, bottom: 0, ...rect }),
  } as unknown as HTMLElement;
}

describe("measureDropdownSpace", () => {
  it("无 overflow 祖先时用视口边界", () => {
    vi.stubGlobal("window", { innerHeight: 800 });
    vi.stubGlobal("getComputedStyle", () => ({ overflowY: "visible" }));
    const trigger = makeEl({ top: 500, bottom: 530 }, makeEl({}, null));
    expect(measureDropdownSpace(trigger).spaceBelow).toBe(800 - 530 - 8);
  });

  it("overflow 祖先裁剪时按其边界计算（弹窗场景）", () => {
    vi.stubGlobal("window", { innerHeight: 800 });
    const modal = makeEl({ top: 50, bottom: 600 }, null);
    const trigger = makeEl({ top: 400, bottom: 430 }, modal);
    vi.stubGlobal("getComputedStyle", () => ({ overflowY: "hidden" }));
    // 弹窗底 600，触发器底 430 → 下方只剩 162
    expect(measureDropdownSpace(trigger).spaceBelow).toBe(600 - 430 - 8);
    expect(measureDropdownSpace(trigger).spaceAbove).toBe(400 - 50 - 8);
  });
});
