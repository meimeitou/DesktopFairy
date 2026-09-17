import { describe, it, expect, beforeEach } from "vitest";
import {
  registerToolAbort,
  unregisterToolAbort,
  cancelToolAbort,
  registerToolAbortHandlers,
  clearAllToolAborts,
} from "../../electron/agentToolAbort.cjs";

beforeEach(() => {
  // registry 是模块级 Map —— 清理防止测试顺序依赖
  clearAllToolAborts();
});

describe("tool abort registry", () => {
  it("cancel aborts the registered controller", () => {
    const controller = registerToolAbort("call-1");
    expect(controller).not.toBeNull();
    expect(cancelToolAbort("call-1")).toBe(true);
    expect(controller.signal.aborted).toBe(true);
  });

  it("abort reason propagates to the controller signal", () => {
    const controller = registerToolAbort("call-reason");
    cancelToolAbort("call-reason");
    expect(controller!.signal.reason).toBeInstanceOf(Error);
  });

  it("cancel on unknown id returns false", () => {
    expect(cancelToolAbort("nope")).toBe(false);
  });

  it("unregister removes the entry so cancel misses", () => {
    const controller = registerToolAbort("call-2");
    unregisterToolAbort("call-2");
    expect(cancelToolAbort("call-2")).toBe(false);
    expect(controller.signal.aborted).toBe(false);
  });

  it("register returns null without an id", () => {
    expect(registerToolAbort("")).toBeNull();
    expect(registerToolAbort(undefined)).toBeNull();
  });

  it("clearAllToolAborts aborts everything", () => {
    const a = registerToolAbort("a");
    const b = registerToolAbort("b");
    clearAllToolAborts();
    expect(a.signal.aborted).toBe(true);
    expect(b.signal.aborted).toBe(true);
    expect(cancelToolAbort("a")).toBe(false);
  });
});

describe("agent:tool:cancel IPC handler", () => {
  function captureHandler() {
    let fn: (event: unknown, payload: { toolCallId?: string }) => Promise<{ ok: boolean }>;
    const ipcMain = {
      handle: (_ch: string, f: typeof fn) => {
        fn = f;
      },
    };
    registerToolAbortHandlers(ipcMain);
    return (payload: { toolCallId?: string }) => fn!(undefined, payload);
  }

  it("returns ok for a live call and aborts it", async () => {
    const call = captureHandler();
    const controller = registerToolAbort("ipc-1");
    const res = await call({ toolCallId: "ipc-1" });
    expect(res.ok).toBe(true);
    expect(controller.signal.aborted).toBe(true);
  });

  it("falls through to MCP abort when registry misses", async () => {
    const call = captureHandler();
    // 'mcp-x' is never registered here; mcpRuntimeService require throws
    // under vitest (electron dep), the handler swallows it, ok stays false.
    const res = await call({ toolCallId: "mcp-x" });
    expect(res.ok).toBe(false);
  });
});
