import { Button } from "@cherrystudio/ui";
import { Maximize2, Minimize2, PanelRightClose, Plus } from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import "./ChatBrowserPane.css";

const api = window.electronAPI;

type BrowserTab = {
  id: string;
  url: string;
  title: string;
};

const NEW_TAB_URL = "about:blank";
const NEW_TAB_TITLE = "新标签页";

const MIN_WIDTH = 320;
const DEFAULT_WIDTH = 420;
const CLOSE_DRAG_THRESHOLD = 80;
const WIDTH_STORAGE_KEY = "df.chat.browserPane.width";

function tabLabel(tab: BrowserTab): string {
  if (tab.title && tab.title !== NEW_TAB_TITLE) return tab.title;
  try {
    const u = new URL(tab.url);
    return u.hostname || NEW_TAB_TITLE;
  } catch {
    return NEW_TAB_TITLE;
  }
}

function genTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type WebviewElement = HTMLElement & {
  src?: string;
  getURL?: () => string;
  loadURL?: (url: string) => void;
};

function BrowserWebview({
  tab,
  active,
  onTitle,
  onUrlChange,
}: {
  tab: BrowserTab;
  active: boolean;
  onTitle: (tabId: string, title: string) => void;
  onUrlChange: (tabId: string, url: string) => void;
}) {
  const ref = useRef<WebviewElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("allowpopups", "true");
    el.src = tab.url;
  }, [tab.id]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onTitleEvent = (e: Event) => {
      const detail = e as Event & { title?: string };
      if (detail.title) onTitle(tab.id, detail.title);
    };

    const onNavigate = (e: Event) => {
      const detail = e as Event & { url?: string };
      if (detail.url && detail.url !== "about:blank") {
        onUrlChange(tab.id, detail.url);
      }
    };

    const onNewWindow = (e: Event) => {
      const detail = e as Event & { preventDefault?: () => void };
      detail.preventDefault?.();
    };

    el.addEventListener("page-title-updated", onTitleEvent);
    el.addEventListener("did-navigate", onNavigate);
    el.addEventListener("did-navigate-in-page", onNavigate);
    el.addEventListener("new-window", onNewWindow);
    return () => {
      el.removeEventListener("page-title-updated", onTitleEvent);
      el.removeEventListener("did-navigate", onNavigate);
      el.removeEventListener("did-navigate-in-page", onNavigate);
      el.removeEventListener("new-window", onNewWindow);
    };
  }, [tab.id, onTitle, onUrlChange]);

  return (
    <webview
      ref={ref}
      className={`browser-webview${active ? " active" : ""}`}
      partition="persist:browser"
    />
  );
}

type TabState = { tabs: BrowserTab[]; activeTabId: string | null };

export default function ChatBrowserPane({
  open,
  onOpenChange,
  onMaximizeChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMaximizeChange: (maximized: boolean) => void;
}) {
  const [tabState, setTabState] = useState<TabState>({
    tabs: [],
    activeTabId: null,
  });
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

  const openTabRef = useRef<(url: string, tabId?: string) => void>(() => {});
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    const off = api.onBrowserPaneOpen?.((payload) => {
      if (!payload?.url) return;
      openTabRef.current(payload.url, payload.tabId);
      onOpenChangeRef.current(true);
    });
    return () => off?.();
  }, []);

  const openTab = useCallback((url: string, tabId?: string) => {
    const normalized = url.trim();
    if (!normalized) return;

    setTabState(({ tabs: prev, activeTabId: currentActive }) => {
      const existing = prev.find((t) => t.url === normalized);
      if (existing) {
        return existing.id === currentActive
          ? { tabs: prev, activeTabId: currentActive }
          : { tabs: prev, activeTabId: existing.id };
      }
      const id = tabId || genTabId();
      const title = normalized === NEW_TAB_URL ? NEW_TAB_TITLE : normalized;
      return { tabs: [...prev, { id, url: normalized, title }], activeTabId: id };
    });
  }, []);
  openTabRef.current = openTab;

  const closeTab = useCallback((tabId: string) => {
    setTabState(({ tabs: prev, activeTabId: currentActive }) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      if (idx < 0) return { tabs: prev, activeTabId: currentActive };
      const next = prev.filter((t) => t.id !== tabId);
      if (currentActive !== tabId) {
        return { tabs: next, activeTabId: currentActive };
      }
      const activeTabId =
        next.length === 0 ? null : next[Math.min(idx, next.length - 1)].id;
      return { tabs: next, activeTabId };
    });
  }, []);

  const updateTabTitle = useCallback((tabId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setTabState(({ tabs: prev, activeTabId }) => ({
      tabs: prev.map((t) => (t.id === tabId ? { ...t, title: trimmed } : t)),
      activeTabId,
    }));
  }, []);

  const updateTabUrl = useCallback((tabId: string, url: string) => {
    setTabState(({ tabs: prev, activeTabId }) => ({
      tabs: prev.map((t) => (t.id === tabId ? { ...t, url } : t)),
      activeTabId,
    }));
  }, []);

  const handleNewTab = () => {
    openTab(NEW_TAB_URL);
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
    activeTab && activeTab.url !== NEW_TAB_URL ? activeTab.url : "";

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
            <Button variant="ghost" key={tab.id} className={`browser-tab${tab.id === activeTabId ? " active" : ""}`} onClick={() => setTabState((s) => ({ ...s, activeTabId: tab.id }))} title={tab.url}>
              <span className="browser-tab-label">{tabLabel(tab)}</span>
              <span
                className="browser-tab-close"
                role="button"
                tabIndex={-1}
                aria-label="关闭标签页"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
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
          readOnly
          value={displayUrl}
          placeholder="无页面"
          onFocus={(e) => e.target.select()}
          onClick={(e) => e.currentTarget.select()}
        />
        <Button variant="ghost" size="sm" className="browser-url-action" onClick={handleCopyUrl} disabled={!displayUrl} title="复制链接">
          {copied ? "已复制" : "复制"}
        </Button>
        <Button variant="ghost" size="sm" className="browser-url-action" onClick={handleOpenExternal} disabled={!displayUrl} title="在默认浏览器打开">
          浏览器打开
        </Button>
      </div>

      <main className="browser-content">
        {tabs.length === 0 ? (
          <div className="browser-empty">点击对话中的链接，或按 + 打开新标签页</div>
        ) : (
          tabs.map((tab) => (
            <BrowserWebview
              key={tab.id}
              tab={tab}
              active={tab.id === activeTabId}
              onTitle={updateTabTitle}
              onUrlChange={updateTabUrl}
            />
          ))
        )}
      </main>
    </div>
  );
}
