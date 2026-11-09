import { Button } from "@cherrystudio/ui";
import { Maximize2, Minimize2, PanelRightClose, Plus, Pause, Play } from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { BrowserState, BrowserTab } from "../../shared/browser";
import ComposerBusyHalo from "./ComposerBusyHalo";
import "./ChatBrowserPane.css";

const api = window.electronAPI;

const MIN_WIDTH = 320;
const DEFAULT_WIDTH = 420;
const CLOSE_DRAG_THRESHOLD = 80;
const WIDTH_STORAGE_KEY = "df.chat.browserPane.width";

function tabLabel(tab: BrowserTab): string {
  if (tab.title && tab.title !== "新标签页") return tab.title;
  try {
    const u = new URL(tab.url);
    return u.hostname || "新标签页";
  } catch {
    return "新标签页";
  }
}

type WebviewElement = HTMLElement & {
  src?: string;
  getWebContentsId?: () => number;
};

function BrowserWebview({ tab, active, onError }: {
  tab: BrowserTab;
  active: boolean;
  onError: (message: string) => void;
}) {
  const ref = useRef<WebviewElement | null>(null);
  const initialUrl = useRef(tab.url);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let connected = false;
    let registering = false;
    let disposed = false;
    const register = () => {
      if (connected || registering || disposed) return;
      let webContentsId: number | undefined;
      try { webContentsId = el.getWebContentsId?.(); }
      catch { return; /* The guest has not attached yet. */ }
      if (!webContentsId) return;
      registering = true;
      void api.invoke("browser:register", { tabId: tab.id, webContentsId })
        .then(() => { connected = true; clearInterval(poll); })
        .catch((e: Error) => { clearInterval(poll); if (!disposed) onError(`页面连接失败：${e.message}`); })
        .finally(() => { registering = false; });
    };
    el.setAttribute("allowpopups", "true");
    // Register the guest independently of the first page finishing its load.
    el.addEventListener("did-attach", register);
    el.addEventListener("dom-ready", register);
    // StrictMode/HMR can reconnect effects after did-attach was dispatched.
    const poll = setInterval(register, 50);
    if (!el.getAttribute("src")) el.src = initialUrl.current;
    register(); // Also recover an already attached guest after renderer HMR.
    return () => {
      disposed = true;
      clearInterval(poll);
      el.removeEventListener("did-attach", register);
      el.removeEventListener("dom-ready", register);
    };
  }, [tab.id, onError]);
  const controlledRequestId = tab.control?.requestId || (tab.pending ? "pending" : undefined);
  useEffect(() => {
    if (controlledRequestId) ref.current?.blur();
  }, [controlledRequestId]);
  return <webview ref={ref} className={`browser-webview${active ? " active" : ""}`} partition="persist:browser" tabIndex={tab.control || tab.pending ? -1 : 0} />;
}

export default function ChatBrowserPane({
  open,
  onOpenChange,
  onMaximizeChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMaximizeChange: (maximized: boolean) => void;
}) {
  const [tabState, setTabState] = useState<BrowserState>({ tabs: [], activeTabId: null, paused: [] });
  const [error, setError] = useState("");
  const [addressDraft, setAddressDraft] = useState<{ tabId: string | null; url: string; value: string } | null>(null);
  const reportError = useCallback((message: string) => setError(message), []);
  const command = useCallback(async (payload: Record<string, string>) => {
    try {
      const result = await api.invoke("browser:ui", payload) as BrowserState & { ok: boolean; error?: string };
      if (!result.ok) { setError(result.error || "操作失败，请重试"); return; }
      setError("");
      // State events are authoritative; avoid rolling them back with an older invoke response.
    } catch (e) { setError(`浏览器连接失败：${String(e)}`); }
  }, []);
  const tabs = tabState.tabs;
  const activeTabId = tabState.activeTabId;
  const [copied, setCopied] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [width, setWidth] = useState(() => {
    const stored = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0
      ? Math.max(MIN_WIDTH, stored)
      : DEFAULT_WIDTH;
  });
  const urlInputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );
  const widthRef = useRef(width);

  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => { onOpenChangeRef.current = onOpenChange; }, [onOpenChange]);
  useEffect(() => {
    let receivedState = false;
    const offState = api.onBrowserState?.((state) => { receivedState = true; setTabState(state); });
    const offOpen = api.onBrowserPaneOpen?.(() => onOpenChangeRef.current(true));
    void api.invoke("browser:ui", { action: "state" }).then((state) => {
      if (!receivedState && (state as BrowserState & { ok: boolean })?.ok) setTabState(state as BrowserState);
    }).catch((e: Error) => reportError(e.message));
    return () => { offState?.(); offOpen?.(); };
  }, [reportError]);
  const controlledTab = tabs.find((tab) => tab.id === activeTabId && (tab.control || tab.pending));
  const paused = tabState.paused.filter((task) => task.tabId === activeTabId || !tabs.some((tab) => tab.id === task.tabId));

  const handleNewTab = () => {
    void command({ action: "open" });
  };

  const handleToggleMaximize = () => {
    setMaximized((v) => !v);
  };

  useEffect(() => {
    onMaximizeChange(maximized);
  }, [maximized, onMaximizeChange]);

  useEffect(() => {
    if (!open) setMaximized(false);
  }, [open]);

  const handleResizePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (maximized) return;
    dragStateRef.current = { startX: e.clientX, startWidth: width };
    widthRef.current = width;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic/unowned pointer — drag still works via bubbling */
    }
  };

  const handleResizePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    const paneRight = drag.startX + drag.startWidth;
    const next = paneRight - e.clientX;
    if (next < MIN_WIDTH - CLOSE_DRAG_THRESHOLD) {
      dragStateRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* nothing captured */
      }
      setWidth(drag.startWidth);
      widthRef.current = drag.startWidth;
      onOpenChange(false);
      return;
    }
    widthRef.current = Math.max(MIN_WIDTH, next);
    setWidth(widthRef.current);
  };

  const handleResizePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    dragStateRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* nothing captured */
    }
    try {
      localStorage.setItem(WIDTH_STORAGE_KEY, String(widthRef.current));
    } catch {
      /* localStorage unavailable */
    }
  };

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const displayUrl =
    activeTab && activeTab.url !== "about:blank" ? activeTab.url : "";

  const address = addressDraft?.tabId === activeTabId && addressDraft.url === displayUrl ? addressDraft.value : displayUrl;

  const navigateAddress = () => {
    if (controlledTab || !address.trim()) return;
    void command({ action: "navigate", ...(activeTabId ? { tabId: activeTabId } : {}), url: address.trim() });
  };

  const handleCopyUrl = async () => {
    if (!displayUrl) return;
    try {
      await navigator.clipboard.writeText(displayUrl);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleOpenExternal = () => {
    if (!displayUrl) return;
    void api.invoke("selection:open_url", displayUrl);
  };

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  return (
    <div
      className={`chat-browser-pane${open ? "" : " collapsed"}${maximized ? " maximized" : ""}`}
      style={maximized ? undefined : { width: `${width}px` }}
    >
      {open && controlledTab?.control ? <ComposerBusyHalo /> : null}
      <div
        className="chat-browser-pane-resize"
        role="separator"
        aria-orientation="vertical"
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
      />
      <header className="browser-topbar">
        <div className="browser-tabstrip">
          {tabs.map((tab) => (
            <Button variant="ghost" key={tab.id} className={`browser-tab${tab.id === activeTabId ? " active" : ""}`} onClick={() => void command({ action: "activate", tabId: tab.id })} title={tab.control ? `${tab.title} · 智能体正在操作` : tab.url}>
              <span className="browser-tab-label">{tabLabel(tab)}</span>
              <span
                className="browser-tab-close"
                role="button"
                tabIndex={-1}
                aria-label="关闭标签页"
                onClick={(e) => {
                  e.stopPropagation();
                  void command({ action: "close", tabId: tab.id });
                }}
              >
                ×
              </span>
            </Button>
          ))}
          <Button variant="ghost" size="sm" className="browser-tab-add" onClick={handleNewTab} title="新标签页"><Plus size={16} /></Button>
        </div>
        <Button variant="ghost" size="sm" className="browser-pane-action" onClick={handleToggleMaximize} title={maximized ? "恢复" : "最大化"}>
          {maximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </Button>
        <Button variant="ghost" size="sm" className="browser-pane-action" onClick={() => onOpenChange(false)} title="关闭面板">
          <PanelRightClose size={16} />
        </Button>
      </header>

      <div className="browser-urlbar">
        <input
          ref={urlInputRef}
          type="text"
          className="browser-url-input"
          readOnly={Boolean(controlledTab)}
          value={address}
          aria-label="网页地址"
          placeholder="输入网址，按 Enter 打开"
          onChange={(e) => setAddressDraft({ tabId: activeTabId, url: displayUrl, value: e.target.value })}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") { e.preventDefault(); navigateAddress(); }
            if (e.key === "Escape") { e.preventDefault(); setAddressDraft(null); e.currentTarget.select(); }
          }}
          onFocus={(e) => e.target.select()}
        />
        <Button variant="ghost" size="sm" className="browser-url-action" onClick={handleCopyUrl} disabled={!displayUrl} title="复制链接">
          {copied ? "已复制" : "复制"}
        </Button>
        <Button variant="ghost" size="sm" className="browser-url-action" onClick={handleOpenExternal} disabled={!displayUrl} title="在默认浏览器打开">
          浏览器打开
        </Button>
      </div>

      {controlledTab ? (
        <div className={`browser-control-bar${controlledTab.control ? " browser-control-bar--active" : ""}`} role="status">
          <span title={controlledTab.control?.topicId}>{controlledTab.control ? `${controlledTab.control.topicName} · ${controlledTab.control.action}` : "正在停止页面操作，请稍候…"}</span>
          {controlledTab.control ? <Button variant="ghost" size="sm" onClick={() => void command({ action: "pause", tabId: controlledTab.id })}><Pause size={14} />暂停并接管</Button> : null}
        </div>
      ) : null}
      {paused.map((task) => (
        <div className="browser-control-bar" key={task.topicId}>
          <span>已暂停，你可以手动操作页面</span>
          <Button variant="ghost" size="sm" disabled={tabs.some((tab) => tab.pending)} onClick={() => void command({ action: "resume", topicId: task.topicId })}><Play size={14} />继续</Button>
          <Button variant="ghost" size="sm" onClick={() => void command({ action: "discard", topicId: task.topicId })}>结束</Button>
        </div>
      ))}
      {error ? <div className="browser-control-error" role="alert">{error}</div> : null}
      <main className="browser-content">
        {tabs.length === 0 ? (
          <div className="browser-empty">点击对话中的链接，或按 + 打开新标签页</div>
        ) : (
          tabs.map((tab) => (
            <BrowserWebview
              key={`${tab.id}:${tab.generation || 1}`}
              tab={tab}
              active={tab.id === activeTabId}
              onError={reportError}
            />
          ))
        )}
        {controlledTab ? <div className="browser-input-shield" aria-hidden="true" /> : null}
      </main>
    </div>
  );
}
