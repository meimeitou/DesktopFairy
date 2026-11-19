import { describe, expect, it, vi } from "vitest";
import { McpSelectionStore } from "./mcpSelectionStore";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe("conversation MCP selections", () => {
  it("retains the checked servers after closing and reopening against the real main-process persistence", async () => {
    const root = mkdtempSync(join(tmpdir(), "mcp-menu-roundtrip-"));
    const require = createRequire(import.meta.url);
    const { registerChatSessionHandlers } = require("../../electron/chatSessionService.cjs");
    const handlers: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
    try {
      const topics = registerChatSessionHandlers({
        ipcMain: { handle: (channel: string, handler: typeof handlers[string]) => { handlers[channel] = handler; } },
        sessionPath: () => join(root, "session.json"), topicsIndexPath: () => join(root, "topics.json"),
        sessionsDir: () => join(root, "sessions"), toolResultsDir: () => join(root, "results"),
        chatLogsDir: () => join(root, "logs"),
      });
      const created = await handlers["chat:topics:create"]({}, { agentId: "agent" }) as { topic: { id: string } };
      const invoke = (channel: string, payload?: unknown) => handlers[channel]({}, payload);
      for (const topicId of [created.topic.id, "terminal:tab"]) {
        const menu = new McpSelectionStore(invoke);
        await menu.load(topicId);
        await menu.set(topicId, ["dns"]);
        await menu.flush(topicId);
        const reopened = new McpSelectionStore(invoke);
        await reopened.load(topicId);
        expect(reopened.get(topicId).override).toEqual(["dns"]);
        expect(topics.getMcpServerIds(topicId)).toEqual(["dns"]);
        await reopened.set(topicId, undefined);
        expect(topics.getMcpServerIds(topicId)).toBeUndefined();
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("does not accept an old main process acknowledgement that ignored MCP selection", async () => {
    const store = new McpSelectionStore(async (channel) => channel === "chat:topics:list"
      ? { topics: [{ id: "a" }] }
      : { ok: true, topic: { id: "a" } });
    await store.load("a");
    await expect(store.set("a", ["dns"])).rejects.toThrow("重启应用");
    expect(store.get("a").override).toBeUndefined();
    expect(store.get("a").error).toContain("重启应用");
    await store.load("a", true);
    expect(store.get("a").error).toContain("重启应用");
  });

  it("distinguishes inherited, explicitly empty and drawer overrides on hydration", async () => {
    const store = new McpSelectionStore(async () => ({
      topics: [{ id: "inherit" }, { id: "empty", mcpServerIds: [] }],
      terminalMcpServerIds: { "terminal:tab": ["dns"] },
    }));
    await Promise.all([store.load("inherit"), store.load("empty"), store.load("terminal:tab")]);
    expect(store.get("inherit").override).toBeUndefined();
    expect(store.get("empty").override).toEqual([]);
    expect(store.get("terminal:tab").override).toEqual(["dns"]);
  });

  it("serializes rapid changes and holds a new request until the final save", async () => {
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    const invoke = vi.fn().mockResolvedValueOnce({ topics: [{ id: "a" }] })
      .mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    const store = new McpSelectionStore(invoke);
    await store.load("a");
    const save1 = store.set("a", ["dns"]);
    const save2 = store.set("a", ["dns", "logs"]);
    const settled = vi.fn();
    const wait = store.flush("a").then(settled);
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
    expect(store.get("a").override).toEqual(["dns", "logs"]);
    first.resolve({ ok: true, mcpServerIds: ["dns"] });
    await save1;
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(3));
    expect(settled).not.toHaveBeenCalled();
    second.resolve({ ok: true, mcpServerIds: ["dns", "logs"] });
    await Promise.all([save2, wait]);
    expect(invoke.mock.calls[2]).toEqual(["chat:topics:updateMeta", { topicId: "a", mcpServerIds: ["dns", "logs"] }]);
    expect(store.get("a").saving).toBe(false);
  });

  it("rolls back failures and restores inheritance using null without affecting other topics", async () => {
    const invoke = vi.fn().mockResolvedValueOnce({ topics: [{ id: "a", mcpServerIds: ["old"] }, { id: "b", mcpServerIds: ["other"] }] })
      .mockResolvedValueOnce({ topics: [{ id: "b", mcpServerIds: ["other"] }] })
      .mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true, mcpServerIds: null });
    const store = new McpSelectionStore(invoke);
    await store.load("a");
    await store.load("b");
    await expect(store.set("a", ["new"])).rejects.toThrow();
    expect(store.get("a").override).toEqual(["old"]);
    expect(store.get("a").error).toContain("已恢复");
    await store.set("a", undefined);
    expect(invoke).toHaveBeenLastCalledWith("chat:topics:updateMeta", { topicId: "a", mcpServerIds: null });
    expect(store.get("a").override).toBeUndefined();
    expect(store.get("b").override).toEqual(["other"]);
  });

  it("does not let an outdated refresh overwrite a newer choice", async () => {
    const refresh = deferred<unknown>();
    const store = new McpSelectionStore(vi.fn().mockResolvedValueOnce({ topics: [{ id: "a" }] })
      .mockReturnValueOnce(refresh.promise).mockResolvedValue({ ok: true, mcpServerIds: [] }));
    await store.load("a");
    const loading = store.load("a", true);
    await store.set("a", []);
    refresh.resolve({ topics: [{ id: "a", mcpServerIds: ["stale"] }] });
    await loading;
    expect(store.get("a").override).toEqual([]);
  });

  it("waits for a newer queued choice when an older save fails during a send", async () => {
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    const store = new McpSelectionStore(vi.fn().mockResolvedValueOnce({ topics: [{ id: "a" }] })
      .mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise));
    await store.load("a");
    const oldSave = store.set("a", ["old"]);
    const waiting = store.flush("a");
    const newSave = store.set("a", ["new"]);
    first.reject(new Error("old write failed"));
    await expect(oldSave).rejects.toThrow();
    second.resolve({ ok: true, mcpServerIds: ["new"] });
    await newSave;
    await expect(waiting).resolves.toBeUndefined();
    expect(store.get("a").override).toEqual(["new"]);
  });
});
