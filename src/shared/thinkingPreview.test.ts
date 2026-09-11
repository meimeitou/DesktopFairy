import { describe, expect, it } from "vitest";
import {
  THINKING_HALF_TAIL_CHARS,
  thinkingPreviewTail,
} from "./thinkingPreview";

/** Same accumulation ChatPage / TerminalAgentDrawer apply to reasoning deltas. */
function accumulate(deltas: string[]): string {
  return deltas.reduce((acc, d) => acc + d, "");
}

describe("reasoning stream vs thinking preview", () => {
  it("delta accumulation is monotonic (model path cannot replace/cover earlier text)", () => {
    const src = "先判断是渲染问题。".repeat(40);
    const deltas = Array.from({ length: Math.ceil(src.length / 7) }, (_, i) =>
      src.slice(i * 7, i * 7 + 7),
    );
    let acc = "";
    for (const d of deltas) {
      const next = acc + d;
      expect(next.startsWith(acc)).toBe(true);
      acc = next;
    }
    expect(accumulate(deltas)).toBe(src);
  });

  it("half-fold tail is bounded and a suffix of the raw stream", () => {
    const src = Array.from(
      { length: 60 },
      (_, i) => `第${i + 1}步：继续往下想，制造足够长的推理。`,
    ).join("\n");
    expect(src.length).toBeGreaterThan(THINKING_HALF_TAIL_CHARS);

    for (let i = 0; i < src.length; i += 13) {
      const acc = src.slice(0, i + 13);
      const tail = thinkingPreviewTail(acc);
      expect(tail.length).toBeLessThanOrEqual(THINKING_HALF_TAIL_CHARS);
      expect(acc.endsWith(tail)).toBe(true);
    }
  });

  it("short reasoning is unchanged", () => {
    expect(thinkingPreviewTail("短思考")).toBe("短思考");
  });
});
