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
    buffer.push("r1", "p", "a");
    buffer.push("r1", "p", "b", "think");
    buffer.push("r1", "p", "c");
    expect(flush).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 5));
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith(
      "r1",
      [{ partId: "p", text: "abc" }],
      "think",
    );
    buffer.dispose();
  });

  it("flushRequest drains pending deltas before done", () => {
    const flush = vi.fn();
    const buffer = createStreamChunkBuffer(flush);
    buffer.push("r1", "p", "hello");
    buffer.flushRequest("r1");
    expect(flush).toHaveBeenCalledWith(
      "r1",
      [{ partId: "p", text: "hello" }],
      "",
    );
    buffer.dispose();
  });

  it("keeps interleaved part ids in order without merging across parts", () => {
    const flush = vi.fn();
    const buffer = createStreamChunkBuffer(flush);
    buffer.push("r1", "a", "1");
    buffer.push("r1", "b", "2");
    buffer.push("r1", "a", "3");
    buffer.flushRequest("r1");
    expect(flush).toHaveBeenCalledWith(
      "r1",
      [
        { partId: "a", text: "1" },
        { partId: "b", text: "2" },
        { partId: "a", text: "3" },
      ],
      "",
    );
    buffer.dispose();
  });

  it("merges consecutive deltas of the same part id", () => {
    const flush = vi.fn();
    const buffer = createStreamChunkBuffer(flush);
    buffer.push("r1", "a", "你");
    buffer.push("r1", "a", "好");
    buffer.flushRequest("r1");
    expect(flush).toHaveBeenCalledWith("r1", [{ partId: "a", text: "你好" }], "");
    buffer.dispose();
  });

  it("flushRequest drains only the named request", async () => {
    const flush = vi.fn();
    const buffer = createStreamChunkBuffer(flush);
    buffer.push("r1", "a", "one");
    buffer.push("r2", "b", "two");
    buffer.flushRequest("r1");
    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith("r1", [{ partId: "a", text: "one" }], "");
    await new Promise((r) => setTimeout(r, 5));
    expect(flush).toHaveBeenCalledTimes(2);
    expect(flush).toHaveBeenLastCalledWith(
      "r2",
      [{ partId: "b", text: "two" }],
      "",
    );
    buffer.dispose();
  });

  it("flushes reasoning and parts in the same frame", () => {
    const flush = vi.fn();
    const buffer = createStreamChunkBuffer(flush);
    buffer.push("r1", "a", "hi", "think");
    buffer.flushRequest("r1");
    expect(flush).toHaveBeenCalledWith(
      "r1",
      [{ partId: "a", text: "hi" }],
      "think",
    );
    buffer.dispose();
  });
});
