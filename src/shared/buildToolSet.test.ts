import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";

// buildToolSet 调用时经 agentTools 模块对象取 executeAgentTool（无加载时
// 解构），测试直接替换模块属性即可生效，无需 require.cache 预注入。
const nodeRequire = createRequire(import.meta.url);
const agentTools = nodeRequire("../../electron/agentTools.cjs") as {
  executeAgentTool: (call: unknown, deps: { signal?: AbortSignal }) => Promise<{
    aborted?: boolean;
    denied?: boolean;
    resultText?: string;
  }>;
};
const { buildToolSet, mergeSignals } = nodeRequire("../../electron/ai/buildToolSet.cjs");
const { cancelToolAbort, clearAllToolAborts } = nodeRequire(
  "../../electron/agentToolAbort.cjs",
);

const DEFS = [
  { type: "function", function: { name: "T", parameters: { type: "object", properties: {} } } },
];

/** 挂起直到 deps.signal abort 再返回 aborted 结果（拟真 executor 行为）。 */
const hangUntilAbort = (
  _call: unknown,
  deps: { signal?: AbortSignal },
): Promise<{ aborted: boolean }> => {
  const { promise, resolve } = Promise.withResolvers<{ aborted: boolean }>();
  const signal = deps.signal;
  if (signal?.aborted) {
    resolve({ aborted: true });
    return promise;
  }
  signal?.addEventListener("abort", () => resolve({ aborted: true }));
  return promise;
};

const originalExecute = agentTools.executeAgentTool;

beforeEach(() => {
  clearAllToolAborts();
  agentTools.executeAgentTool = hangUntilAbort;
});

afterEach(() => {
  agentTools.executeAgentTool = originalExecute;
  clearAllToolAborts();
});

describe("mergeSignals (pure)", () => {
  it("propagates a pre-aborted source synchronously", () => {
    const sc = new AbortController();
    sc.abort();
    const merged = mergeSignals(sc.signal, new AbortController().signal);
    expect(merged.aborted).toBe(true);
  });

  it("fires when either source aborts later", () => {
    const stream = new AbortController();
    const tool = new AbortController();
    const merged = mergeSignals(stream.signal, tool.signal);
    expect(merged.aborted).toBe(false);
    tool.abort();
    expect(merged.aborted).toBe(true);

    const merged2 = mergeSignals(
      new AbortController().signal,
      new AbortController().signal,
    );
    merged2.addEventListener("abort", () => {}, { once: true });
    stream.abort();
    expect(merged2.aborted).toBe(false); // stream 是新实例，不串扰
  });

  it("returns the other signal when one side is absent", () => {
    const only = new AbortController().signal;
    expect(mergeSignals(only, null)).toBe(only);
    expect(mergeSignals(null, only)).toBe(only);
  });
});

describe("buildToolSet execute (via agentTools.executeAgentTool)", () => {
  it("pre-aborted stream signal throws AbortError immediately (no hang)", async () => {
    const sc = new AbortController();
    sc.abort();
    const p = buildToolSet(DEFS, {}).T.execute(
      {},
      { toolCallId: "pre", abortSignal: sc.signal },
    );
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });

  it("mid-flight tool cancel throws readable Chinese tool error", async () => {
    const p = buildToolSet(DEFS, {}).T.execute(
      {},
      { toolCallId: "cancel", abortSignal: new AbortController().signal },
    );
    cancelToolAbort("cancel");
    await expect(p).rejects.toMatchObject({
      name: "Error",
      message: "工具调用已被用户取消",
    });
  });

  it("mid-flight stream abort stays AbortError", async () => {
    const sc = new AbortController();
    const p = buildToolSet(DEFS, {}).T.execute(
      {},
      { toolCallId: "stream", abortSignal: sc.signal },
    );
    sc.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });

  it("successful result JSON-parses; raw text wraps as content", async () => {
    agentTools.executeAgentTool = async () => ({ resultText: '{"ok":true,"v":42}' });
    const a = await buildToolSet(DEFS, {}).T.execute({}, { toolCallId: "j1" });
    expect(a).toEqual({ ok: true, v: 42 });

    agentTools.executeAgentTool = async () => ({ resultText: "plain output" });
    const b = await buildToolSet(DEFS, {}).T.execute({}, { toolCallId: "j2" });
    expect(b).toEqual({ ok: true, content: "plain output" });
  });

  it("denied tool returns structured denial, not an error", async () => {
    agentTools.executeAgentTool = async () => ({ denied: true });
    const p = await buildToolSet(DEFS, {}).T.execute({}, { toolCallId: "d1" });
    expect(p).toEqual({ ok: false, error: "User denied tool execution" });
  });
});
