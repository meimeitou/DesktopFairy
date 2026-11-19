import type { ChatTopic, ChatTopicsStore } from "../shared/chatSession";

export interface McpSelectionSnapshot {
  loaded: boolean;
  override?: string[];
  saving: boolean;
  error?: string;
}
type Invoke = (channel: string, payload?: unknown) => Promise<unknown>;
const EMPTY: McpSelectionSnapshot = { loaded: false, saving: false };
const RESTART_REQUIRED = "MCP 选择未保存，请重启应用后重新勾选。";

/** Shared by all composers and the transport, so sends wait for pending saves. */
export class McpSelectionStore {
  private states = new Map<string, McpSelectionSnapshot>();
  private listeners = new Set<() => void>();
  private loads = new Map<string, Promise<void>>();
  private saves = new Map<string, Promise<void>>();
  private committed = new Map<string, string[] | undefined>();
  private revisions = new Map<string, number>();
  private saveErrors = new Map<string, string>();
  constructor(private invoke: Invoke) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  get = (topicId: string) => this.states.get(topicId) ?? EMPTY;
  private publish(topicId: string, patch: Partial<McpSelectionSnapshot>) {
    this.states.set(topicId, { ...this.get(topicId), ...patch });
    this.listeners.forEach((listener) => listener());
  }
  load(topicId: string, refresh = false): Promise<void> {
    if (!topicId) return Promise.resolve();
    const existing = this.loads.get(topicId);
    if (existing) return existing;
    if (!refresh && this.get(topicId).loaded) return Promise.resolve();
    const revision = this.revisions.get(topicId) ?? 0;
    const task = (async () => {
      try {
        const store = await this.invoke("chat:topics:list") as ChatTopicsStore;
        const override = topicId.startsWith("terminal:")
          ? store.terminalMcpServerIds?.[topicId]
          : store.topics.find((topic) => topic.id === topicId)?.mcpServerIds;
        if ((this.revisions.get(topicId) ?? 0) !== revision || this.saves.has(topicId)) return;
        this.committed.set(topicId, override);
        this.publish(topicId, { loaded: true, override, error: this.saveErrors.get(topicId) });
      } catch {
        this.publish(topicId, { error: "无法加载会话的 MCP 选择，请重试。" });
      }
    })().finally(() => { this.loads.delete(topicId); });
    this.loads.set(topicId, task);
    return task;
  }
  set(topicId: string, override: string[] | undefined): Promise<void> {
    const ids = override === undefined ? undefined : [...new Set(override)];
    const revision = (this.revisions.get(topicId) ?? 0) + 1;
    this.revisions.set(topicId, revision);
    this.saveErrors.delete(topicId);
    this.publish(topicId, { override: ids, saving: true, error: undefined });
    const previous = this.saves.get(topicId) ?? Promise.resolve();
    const task = previous.catch(() => {}).then(async () => {
      const result = await this.invoke("chat:topics:updateMeta", {
        topicId, mcpServerIds: ids ?? null,
      }) as { ok: boolean; topic?: ChatTopic; mcpServerIds?: string[] | null; error?: string };
      if (!result.ok) throw new Error(result.error || "保存失败");
      // Older main processes return ok for updateMeta but silently ignore new
      // fields. Require the persisted value, not just the generic acknowledgement.
      if (!Object.hasOwn(result, "mcpServerIds")) throw new Error(RESTART_REQUIRED);
      if (JSON.stringify(result.mcpServerIds) !== JSON.stringify(ids ?? null)) {
        throw new Error("MCP 选择未正确保存，请重试。");
      }
      this.committed.set(topicId, ids);
    }).catch((error) => {
      if (this.revisions.get(topicId) === revision) {
        const message = error instanceof Error && error.message === RESTART_REQUIRED
          ? RESTART_REQUIRED : "MCP 选择保存失败，已恢复原选择，请重试。";
        this.saveErrors.set(topicId, message);
        this.publish(topicId, { override: this.committed.get(topicId), error: message });
      }
      throw error;
    }).finally(() => {
      if (this.saves.get(topicId) === task) {
        this.saves.delete(topicId);
        this.publish(topicId, { saving: false });
      }
    });
    this.saves.set(topicId, task);
    // Callers may fire-and-forget; transport still observes the original rejection.
    void task.catch(() => {});
    return task;
  }
  async flush(topicId: string) {
    let pending: Promise<void> | undefined;
    while ((pending = this.saves.get(topicId))) {
      const revision = this.revisions.get(topicId);
      try { await pending; }
      catch (error) {
        // A newer choice supersedes an older failed save. Wait for that choice,
        // rather than rejecting a send that can use the successfully saved state.
        if (this.revisions.get(topicId) === revision ||
            (!this.saves.has(topicId) && this.get(topicId).error)) throw error;
      }
    }
  }
}

export const mcpSelectionStore = new McpSelectionStore((channel, payload) => window.electronAPI.invoke(channel, payload));
