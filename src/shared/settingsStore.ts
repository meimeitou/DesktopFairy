import { useSyncExternalStore } from "react";
import {
  cacheSettingsLocally,
  loadSettings,
  saveSettings,
  type AppSettings,
  type SettingsSyncResult,
} from "./settings";

type Listener = () => void;
type SettingsUpdater = AppSettings | ((prev: AppSettings) => AppSettings);

const SAVE_DEBOUNCE_MS = 80;

let current: AppSettings = loadSettings();
/** Monotonic revision from main process settings:sync / setSnapshot. */
let remoteRevision = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * Serializes disk/IPC persists. Each job reads `current` at run time so a
 * queued save always writes the latest renderer truth (not a stale snapshot).
 */
let persistChain: Promise<void> = Promise.resolve();
/** Covers the whole enqueue job including remoteRevision update after IPC. */
let persistInFlight = 0;
let persistError: string | null = null;
let listenersAttached = false;

const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

function replaceCurrent(next: AppSettings) {
  current = next;
  cacheSettingsLocally(next);
  emit();
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void enqueuePersist();
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Queue a persist of whatever `current` is when the job runs.
 * Concurrent callers share one chain — never fire parallel settings:sync.
 */
function enqueuePersist(): Promise<SettingsSyncResult> {
  const task = persistChain.then(async () => {
    persistInFlight += 1;
    try {
      const settings = current;
      const r = (await saveSettings(settings)) as SettingsSyncResult & {
        revision?: number;
      };
      // Keep persistInFlight until revision is recorded so echoes cannot race
      // in between saveSettings' pending counter and this update.
      if (typeof r.revision === "number" && r.revision > remoteRevision) {
        remoteRevision = r.revision;
      }
      const nextError = r.persisted ? null : r.error ?? "设置写入磁盘失败";
      if (nextError !== persistError) {
        persistError = nextError;
        emit();
      }
      return r;
    } finally {
      persistInFlight = Math.max(0, persistInFlight - 1);
    }
  });
  persistChain = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}

/**
 * Flush any debounced save and wait for in-flight persists so the main
 * snapshot matches the renderer before ai:stream_open / chat:send.
 */
export async function flushSettingsSave(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
    await enqueuePersist();
    return;
  }
  await persistChain;
}

/** Subscribe to settings changes (useSyncExternalStore). */
export function subscribeSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSettingsSnapshot(): AppSettings {
  return current;
}

export function getSettingsPersistError(): string | null {
  return persistError;
}

/**
 * Apply a local settings change. Updates memory + localStorage immediately,
 * then debounced-persists to disk / broadcasts via settings:sync.
 */
export function setSettings(update: SettingsUpdater): AppSettings {
  const prev = current;
  const next = typeof update === "function" ? update(prev) : update;
  if (next === prev) return prev;
  replaceCurrent(next);
  scheduleSave();
  return next;
}

/**
 * Handle settings:updated from main. Drops stale echoes while a local save is
 * in flight, or when the remote revision is not newer than what we already saw.
 */
export function applyRemoteSettings(
  incoming: unknown,
  meta?: { revision?: number },
): AppSettings {
  if (!incoming || typeof incoming !== "object") return current;

  const revision =
    typeof meta?.revision === "number"
      ? meta.revision
      : typeof (incoming as { revision?: number }).revision === "number"
        ? (incoming as { revision: number }).revision
        : undefined;

  // Only compare main-process revisions to each other — never against a local
  // edit counter (those clocks are independent and caused false drops).
  if (typeof revision === "number") {
    if (revision <= remoteRevision) return current;
  }

  if (persistInFlight > 0 || saveTimer) {
    // Local edit not fully synced yet — keep renderer truth.
    return current;
  }

  const next = incoming as AppSettings;
  if (JSON.stringify(next) === JSON.stringify(current)) {
    if (typeof revision === "number") remoteRevision = revision;
    return current;
  }
  if (typeof revision === "number") remoteRevision = revision;
  replaceCurrent(next);
  return current;
}

/** Install the single settings:updated listener for this renderer process. */
export function installSettingsSyncListener(): () => void {
  if (listenersAttached) return () => {};
  const api = window.electronAPI;
  if (!api?.onSettingsUpdated) return () => {};
  listenersAttached = true;
  const off = api.onSettingsUpdated((incoming) => {
    const revision =
      incoming &&
      typeof incoming === "object" &&
      typeof (incoming as { revision?: number }).revision === "number"
        ? (incoming as { revision: number }).revision
        : undefined;
    // Main may send { settings, revision } or bare settings for compatibility.
    const payload =
      incoming &&
      typeof incoming === "object" &&
      "settings" in incoming &&
      (incoming as { settings?: unknown }).settings &&
      typeof (incoming as { settings: unknown }).settings === "object"
        ? (incoming as { settings: unknown }).settings
        : incoming;
    applyRemoteSettings(payload, { revision });
  });
  return () => {
    listenersAttached = false;
    off?.();
  };
}

/** Full settings subscription for React components. */
export function useSettings(): AppSettings {
  return useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getSettingsSnapshot);
}

export function useSettingsPersistError(): string | null {
  return useSyncExternalStore(
    subscribeSettings,
    getSettingsPersistError,
    getSettingsPersistError,
  );
}
