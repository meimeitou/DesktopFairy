import { useCallback, useEffect, useRef, useState } from "react";
import "./BrowserPage.css";

const api = window.electronAPI;

type BrowserTab = {
  id: string;
  url: string;
  title: string;
};

const NEW_TAB_URL = "about:blank";
const NEW_TAB_TITLE = "新标签页";

function tabLabel(tab: BrowserTab): string {
  if (tab.title && tab.title !== NEW_TAB_TITLE) return tab.title;
  try {
    const host = new URL(tab.url).hostname;
    return host || NEW_TAB_TITLE;
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

export default function BrowserPage() {
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().includes("MAC");

  useEffect(() => {
    document.title = "浏览器";
    document.documentElement.classList.add("browser-window-shell");
    if (isMac) document.documentElement.classList.add("browser-page-mac");
    return () => {
      document.documentElement.classList.remove("browser-window-shell", "browser-page-mac");
    };
  }, [isMac]);

  const openTab = useCallback((url: string, tabId?: string) => {
    const normalized = url.trim();
    if (!normalized) return;

    setTabs((prev) => {
      const existing = prev.find((t) => t.url === normalized);
      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }
      const id = tabId || genTabId();
      const title = normalized === NEW_TAB_URL ? NEW_TAB_TITLE : normalized;
      setActiveTabId(id);
      return [...prev, { id, url: normalized, title }];
    });
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      if (idx < 0) return prev;
      const next = prev.filter((t) => t.id !== tabId);
      setActiveTabId((current) => {
        if (current !== tabId) return current;
        if (next.length === 0) return null;
        const neighbor = next[Math.min(idx, next.length - 1)];
        return neighbor.id;
      });
      return next;
    });
  }, []);

  const updateTabTitle = useCallback((tabId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, title: trimmed } : t)),
    );
  }, []);

  const updateTabUrl = useCallback((tabId: string, url: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, url } : t)),
    );
  }, []);

  useEffect(() => {
    const off = api.onBrowserOpenTab?.((payload) => {
      if (!payload?.url) return;
      openTab(payload.url, payload.tabId);
    });
    return () => off?.();
  }, [openTab]);

  const handleNewTab = () => {
    openTab(NEW_TAB_URL);
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

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  return (
    <div className={`browser-page${isMac ? " browser-page-mac" : ""}`}>
      <header className="browser-topbar">
        <div className="browser-tabstrip">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`browser-tab${tab.id === activeTabId ? " active" : ""}`}
              onClick={() => setActiveTabId(tab.id)}
              title={tab.url}
            >
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
            </button>
          ))}
          <button
            type="button"
            className="browser-tab-add"
            onClick={handleNewTab}
            title="新标签页"
          >
            +
          </button>
        </div>
        <div className="browser-topbar-drag" aria-hidden />
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
        <button
          type="button"
          className="browser-url-copy"
          onClick={handleCopyUrl}
          disabled={!displayUrl}
          title="复制链接"
        >
          {copied ? "已复制" : "复制"}
        </button>
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
