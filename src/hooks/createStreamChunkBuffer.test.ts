import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStreamChunkBuffer } from "./createStreamChunkBuffer";

describe("createStreamChunkBuffer", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "requestAnimationFrame",
      (cb: FrameRequestCallback) => {
        return setTimeout(() => cb(performance.now()), 0) as unknown as number;
      },
    );
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("coalesces multiple pushes into one flush per frame", async () => {
    const flush = vi.fn();
    const buffer = createStreamChunkBuffer(flush);
    buffer.push("r1", "a", undefined);
    buffer.push("r1", "b", "think");
    buffer.push("r1", "c", undefined);
    expect(flush).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 5));
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith("r1", "abc", "think");
    buffer.dispose();
  });

  it("flushRequest drains pending deltas before done", () => {
    const flush = vi.fn();
    const buffer = createStreamChunkBuffer(flush);
    buffer.push("r1", "hello", undefined);
    buffer.flushRequest("r1");
    expect(flush).toHaveBeenCalledWith("r1", "hello", "");
    buffer.dispose();
  });
});
