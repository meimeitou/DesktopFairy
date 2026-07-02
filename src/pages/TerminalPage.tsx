import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import "./TerminalPage.css";
import TerminalAgentDrawer from "../components/terminal/TerminalAgentDrawer";
import TerminalSelectionTooltip from "../components/terminal/TerminalSelectionTooltip";

const api = window.electronAPI;

function TerminalInstance({
  isActive,
  tabId,
  onSessionReady,
  onSessionEnd,
  onSelectionChange,
}: {
  isActive: boolean;
  tabId: string;
  onSessionReady?: (tabId: string, sessionId: string) => void;
  onSessionEnd?: (tabId: string) => void;
  onSelectionChange?: (tabId: string, text: string, x: number, y: number) => void;
}) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string>("");
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const xterm = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "transparent",
        foreground: "rgba(255, 255, 255, 0.85)",
        cursor: "rgba(255, 255, 255, 0.7)",
        selectionBackground: "rgba(255, 255, 255, 0.15)",
      },
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    const { cols, rows } = xterm;
    let isMounted = true;
    api
      .invoke("pty:create", { cols, rows })
      .then((result) => {
        if (!isMounted) {
          const { sessionId } = result as { sessionId: string };
          api.invoke("pty:kill", { sessionId });
          return;
        }
        const { sessionId } = result as { sessionId: string };
        sessionIdRef.current = sessionId;
        onSessionReady?.(tabId, sessionId);
      })
      .catch((err) => {
        if (isMounted) {
          xterm.write(`\r\n[创建进程失败: ${err.message || String(err)}]\r\n`);
        }
      });

    const inputData = xterm.onData((data) => {
      if (sessionIdRef.current) {
        api.invoke("pty:input", { sessionId: sessionIdRef.current, data });
      }
    });

    const offOutput = api.onPtyOutput?.(({ sessionId, data }) => {
      if (sessionId !== sessionIdRef.current) return;
      xterm.write(data);
    });

    const offExit = api.onPtyExit?.(({ sessionId }) => {
      if (sessionId === sessionIdRef.current) {
        xterm.write("\r\n[进程已退出]\r\n");
        sessionIdRef.current = "";
      }
    });

    xterm.attachCustomKeyEventHandler((event) => {
      if (event.metaKey && event.type === "keydown") {
        if (event.key === "c") {
          const selection = xterm.getSelection();
          if (selection) {
            navigator.clipboard.writeText(selection);
            return false;
          }
        }
      }
      return true;
    });

    const el = terminalRef.current;
    const handleMouseUp = (e: MouseEvent) => {
      const selection = xterm.getSelection();
      if (selection?.trim() && el) {
        const rect = el.getBoundingClientRect();
        onSelectionChange?.(tabId, selection, e.clientX - rect.left, e.clientY - rect.top);
      }
    };
    const handleMouseDown = () => {
      onSelectionChange?.(tabId, "", 0, 0);
    };
    el?.addEventListener("mouseup", handleMouseUp);
    el?.addEventListener("mousedown", handleMouseDown);

    const handleResize = () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => {
        requestAnimationFrame(() => {
          if (fitAddonRef.current) fitAddonRef.current.fit();
        });
      }, 100);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(terminalRef.current);

    xterm.onResize(({ cols, rows }) => {
      if (sessionIdRef.current) {
        api.invoke("pty:resize", {
          sessionId: sessionIdRef.current,
          cols,
          rows,
        });
      }
    });

    return () => {
      isMounted = false;
      inputData.dispose();
      offOutput?.();
      offExit?.();
      el?.removeEventListener("mouseup", handleMouseUp);
      el?.removeEventListener("mousedown", handleMouseDown);
      resizeObserver.disconnect();
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      const endedSessionId = sessionIdRef.current;
      if (endedSessionId) {
        api.invoke("pty:kill", { sessionId: endedSessionId });
      }
      onSessionEnd?.(tabId);
      xterm.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      sessionIdRef.current = "";
    };
  }, [onSessionEnd, onSessionReady, onSelectionChange, tabId]);

  useEffect(() => {
    if (!isActive || !terminalRef.current || !fitAddonRef.current) return;

    const el = terminalRef.current;

    const doFit = () => {
      fitAddonRef.current?.fit();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const xterm = xtermRef.current;
          if (xterm) {
            xterm.scrollToBottom();
            xterm.refresh(0, xterm.rows - 1);
            xterm.focus();
          }
        });
      });
    };

    if (el.clientWidth > 0 && el.clientHeight > 0) {
      doFit();
      return;
    }

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          doFit();
          ro.disconnect();
          break;
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isActive]);

  return (
    <div
      ref={terminalRef}
      className={`terminal-instance${isActive ? " active" : ""}`}
    />
  );
}

export default function TerminalPage({
  isActive = false,
}: {
  isActive?: boolean;
}) {
  const [tabs, setTabs] = useState<{ id: string; title: string }[]>(() => [
    { id: `tab_${Date.now()}`, title: "终端 1" },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectionTip, setSelectionTip] = useState<{
    text: string;
    x: number;
    y: number;
    tabId: string;
  } | null>(null);
  const nextTabIndex = useRef(2);
  const sessionMapRef = useRef<Map<string, string>>(new Map());
  const pendingCommandMapRef = useRef<Map<string, string[]>>(new Map());

  const pasteCommandToTab = useCallback((tabId: string, command: string) => {
    const sessionId = sessionMapRef.current.get(tabId);
    if (!sessionId) {
      const queue = pendingCommandMapRef.current.get(tabId) ?? [];
      queue.push(command);
      pendingCommandMapRef.current.set(tabId, queue);
      return false;
    }

    api.invoke("pty:input", { sessionId, data: command });
    return true;
  }, []);

  const flushPendingCommands = useCallback((tabId: string) => {
    const sessionId = sessionMapRef.current.get(tabId);
    if (!sessionId) return;

    const queue = pendingCommandMapRef.current.get(tabId);
    if (!queue?.length) return;

    pendingCommandMapRef.current.delete(tabId);
    for (const command of queue) {
      api.invoke("pty:input", { sessionId, data: command });
    }
  }, []);

  const handleSessionReady = useCallback(
    (tabId: string, sessionId: string) => {
      sessionMapRef.current.set(tabId, sessionId);
      flushPendingCommands(tabId);
    },
    [flushPendingCommands],
  );

  const handleSessionEnd = useCallback((tabId: string) => {
    sessionMapRef.current.delete(tabId);
    pendingCommandMapRef.current.delete(tabId);
  }, []);

  const getActiveSessionId = useCallback(() => {
    return sessionMapRef.current.get(activeTabId);
  }, [activeTabId]);

  const handleSelectionChange = useCallback(
    (tabId: string, text: string, x: number, y: number) => {
      if (!text) {
        setSelectionTip((prev) => (prev?.tabId === tabId ? null : prev));
        return;
      }
      setSelectionTip({ text, x, y, tabId });
    },
    [],
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const { command } = (e as CustomEvent<{ command?: string }>).detail ?? {};
      if (!command) return;
      pasteCommandToTab(activeTabId, command);
    };
    window.addEventListener("terminal:run-command", handler);
    return () => window.removeEventListener("terminal:run-command", handler);
  }, [activeTabId, pasteCommandToTab]);

  const handleAddTab = useCallback(() => {
    const newId = `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const newTitle = `终端 ${nextTabIndex.current++}`;
    setTabs((prev) => [...prev, { id: newId, title: newTitle }]);
    setActiveTabId(newId);
  }, []);

  const handleCloseTab = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setTabs((prev) => {
        if (prev.length <= 1) return prev;
        const idx = prev.findIndex((t) => t.id === id);
        const nextTabs = prev.filter((t) => t.id !== id);
        if (activeTabId === id) {
          const nextActive = nextTabs[Math.max(0, idx - 1)].id;
          setActiveTabId(nextActive);
        }
        return nextTabs;
      });
    },
    [activeTabId],
  );

  const handleCloseActiveTab = useCallback(() => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((t) => t.id === activeTabId);
      const nextTabs = prev.filter((t) => t.id !== activeTabId);
      const nextActive = nextTabs[Math.max(0, idx - 1)].id;
      setActiveTabId(nextActive);
      return nextTabs;
    });
  }, [activeTabId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;

      if (e.metaKey && e.key === "t") {
        e.preventDefault();
        handleAddTab();
      } else if (e.metaKey && e.key === "w") {
        e.preventDefault();
        handleCloseActiveTab();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, handleAddTab, handleCloseActiveTab]);

  return (
    <div className="terminal-page">
      <div className="terminal-page-left">
        <div className="terminal-instances-wrapper">
          {tabs.map((tab) => (
            <TerminalInstance
              key={tab.id}
              tabId={tab.id}
              isActive={tab.id === activeTabId && isActive}
              onSessionReady={handleSessionReady}
              onSessionEnd={handleSessionEnd}
              onSelectionChange={handleSelectionChange}
            />
          ))}
          {selectionTip && selectionTip.tabId === activeTabId && (
            <TerminalSelectionTooltip
              text={selectionTip.text}
              x={selectionTip.x}
              y={selectionTip.y}
              containerWidth={(selectionTip.x + 9999)}
              containerHeight={(selectionTip.y + 9999)}
              onAddToChat={() => {
                window.dispatchEvent(
                  new CustomEvent("terminal:add-to-chat", {
                    detail: { text: selectionTip.text },
                  }),
                );
                setDrawerOpen(true);
                setSelectionTip(null);
              }}
              onClose={() => setSelectionTip(null)}
            />
          )}
        </div>

        <div className="terminal-tabs-bottom">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`terminal-tab-item${tab.id === activeTabId ? " active" : ""}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span>{tab.title}</span>
              {tabs.length > 1 && (
                <div
                  className="terminal-tab-close"
                  onClick={(e) => handleCloseTab(tab.id, e)}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
              )}
            </button>
          ))}
          <button
            type="button"
            className="terminal-tab-add"
            onClick={handleAddTab}
            title="新建终端 (Cmd+T)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <TerminalAgentDrawer
        isOpen={drawerOpen}
        onToggle={() => setDrawerOpen((v) => !v)}
        activeTabId={activeTabId}
        getActiveSessionId={getActiveSessionId}
        tabIds={tabs.map((t) => t.id)}
      />

      <button
        type="button"
        className={`terminal-agent-toggle${drawerOpen ? " open" : ""}`}
        onClick={() => setDrawerOpen((v) => !v)}
        title="AI 助手"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9Z" />
          <path d="M9 10h.01" />
          <path d="M15 10h.01" />
          <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
          <path d="M12 3v2" />
          <path d="M4.2 7.5l1.4-1.4" />
          <path d="M18.4 6.1l1.4 1.4" />
        </svg>
      </button>
    </div>
  );
}
