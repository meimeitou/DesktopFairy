import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const nodeRequire = createRequire(import.meta.url);
const { pipeStreamLoop } = nodeRequire(
  "../../electron/ai/streamManager/pipeStreamLoop.cjs",
);

function streamOf(chunks: unknown[]) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

describe("pipeStreamLoop finish reason", () => {
  it("reads finishReason from the UI finish chunk when finish-step has none", async () => {
    const ac = new AbortController();
    const { lastFinishReason } = await pipeStreamLoop(
      streamOf([
        { type: "start-step" },
        { type: "finish-step" },
        { type: "finish", finishReason: "tool-calls" },
      ]),
      ac.signal,
      { onChunk() {} },
    );
    expect(lastFinishReason).toBe("tool-calls");
  });

  it("does not treat a natural stop as a cut-off", async () => {
    const ac = new AbortController();
    const { lastFinishReason } = await pipeStreamLoop(
      streamOf([
        { type: "finish-step" },
        { type: "finish", finishReason: "stop" },
      ]),
      ac.signal,
      { onChunk() {} },
    );
    expect(lastFinishReason).toBe("stop");
  });

  it("uses the final finish reason when an earlier step also finished", async () => {
    const ac = new AbortController();
    const { lastFinishReason } = await pipeStreamLoop(
      streamOf([
        { type: "finish-step", finishReason: "tool-calls" },
        { type: "finish-step", finishReason: "stop" },
        { type: "finish", finishReason: "stop" },
      ]),
      ac.signal,
      { onChunk() {} },
    );
    expect(lastFinishReason).toBe("stop");
  });
});
