import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import "./TerminalPage.css";
import TerminalAgentDrawer from "../components/terminal/TerminalAgentDrawer";
import TerminalSelectionTooltip from "../components/terminal/TerminalSelectionTooltip";
import TerminalSettingsTab from "../components/terminal/TerminalSettingsTab";
import SshConnectionPicker from "../components/terminal/SshConnectionPicker";
import {
  loadSettings,
  saveSettings,
  type AppSettings,
  type SshHost,
  type TerminalSettings,
} from "../shared/settings";
import { appendSshRecent } from "../shared/terminalSettings";

const api = window.electronAPI;

function quoteForUnix(p: string): string {
  return `'${p.replace(/'/g, "'\\''")}'`;
}

function TerminalInstance({
  isActive,
  tabId,
  sshHost,
  terminalSettings,
  onSessionReady,
  onSessionEnd,
  onSessionExit,
  onSelectionChange,
  onTitleChange,
}: {
  isActive: boolean;
  tabId: string;
  sshHost?: SshHost;
  terminalSettings: TerminalSettings;
  onSessionReady?: (tabId: string, sessionId: string, kind: "terminal" | "ssh") => void;
  onSessionEnd?: (tabId: string) => void;
  onSessionExit?: (tabId: string) => void;
  onSelectionChange?: (tabId: string, text: string, x: number, y: number) => void;
  onTitleChange?: (tabId: string, title: string) => void;
}) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string>("");
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bracketed paste mode tracking — shell emits \x1b[?2004h on prompt entry
  // and \x1b[?2004l on exit. When active, pasted input must be wrapped in
  // \x1b[200~...\x1b[201~ so the shell treats it as literal text.
  const bracketedPasteRef = useRef(false);
  // Use a ref for settings so the main useEffect (terminal creation) doesn't
  // re-run on every settings change. Live updates are applied in a separate
  // useEffect below.
  const settingsRef = useRef(terminalSettings);
  settingsRef.current = terminalSettings;

  useEffect(() => {
    if (!terminalRef.current) return;

    const isSsh = !!sshHost;
    const ts = settingsRef.current;

    const xterm = new Terminal({
      cursorBlink: true,
      fontSize: ts.fontSize,
      fontFamily: ts.fontFamily,
      scrollback: ts.scrollback,
      cursorStyle: ts.cursorStyle,
      bellStyle: "none", // custom visual bell via onBell handler
      theme: {
        background: "transparent",
        foreground: "rgba(255, 255, 255, 0.85)",
        cursor: "rgba(255, 255, 255, 0.7)",
        selectionBackground: "rgba(255, 255, 255, 0.15)",
      },
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    // WebLinksAddon: http/https URLs become clickable, opened via shell.openExternal.
    // Reuses the existing `selection:open_url` IPC channel rather than adding a
    // new `shell:openExternal` channel — same underlying handler, less surface.
    xterm.loadAddon(new WebLinksAddon((_event, uri) => {
      void api.invoke("selection:open_url", uri);
    }));
    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Visual bell — CSS shake animation on the terminal element.
    xterm.onBell(() => {
      const bellEl = terminalRef.current;
      if (!bellEl) return;
      bellEl.classList.remove("terminal-bell-shake");
      void bellEl.offsetWidth; // force reflow to restart animation
      bellEl.classList.add("terminal-bell-shake");
    });

    // Tab title from OSC 0/2 escape sequences (shell sets terminal title).
    xterm.onTitleChange((title) => {
      const trimmed = title?.trim();
      if (trimmed) {
        onTitleChange?.(tabId, trimmed.slice(0, 30));
      }
    });

    // OSC 52 remote clipboard sync (write-only, refuse read for safety).
    xterm.parser.registerOscHandler(52, (data) => {
      if (data.startsWith("?")) return false; // reject read requests
      const b64 = data.includes(";") ? data.split(";").pop() ?? "" : data;
      if (!b64) return false;
      try {
        navigator.clipboard.writeText(atob(b64));
      } catch { /* ignore malformed base64 */ }
      return false;
    });

    const { cols, rows } = xterm;
    let isMounted = true;

    const createParams = isSsh
      ? {
          host: sshHost!.host,
          port: sshHost!.port,
          user: sshHost!.user,
          authMethod: sshHost!.authMethod,
          password: sshHost!.password,
          privateKeyPath: sshHost!.privateKeyPath,
          proxyJump: sshHost!.proxyJump,
          cols,
          rows,
        }
      : { cols, rows };

    const createChannel = isSsh ? "ssh:create" : "pty:create";
    const inputChannel = isSsh ? "ssh:input" : "pty:input";
    const resizeChannel = isSsh ? "ssh:resize" : "pty:resize";
    const killChannel = isSsh ? "ssh:kill" : "pty:kill";
    const onOutput = isSsh ? api.onSshOutput : api.onPtyOutput;
    const onExit = isSsh ? api.onSshExit : api.onPtyExit;
    const kind: "terminal" | "ssh" = isSsh ? "ssh" : "terminal";

    api
      .invoke(createChannel, createParams)
      .then((result) => {
        if (!isMounted) {
          const { sessionId } = result as { sessionId: string };
          if (sessionId) void api.invoke(killChannel, { sessionId });
          return;
        }
        const { sessionId, error } = result as { sessionId?: string; error?: string };
        if (error) {
          xterm.write(`\r\n[${isSsh ? "SSH 连接失败" : "创建进程失败"}: ${error}]\r\n`);
          return;
        }
        if (!sessionId) return;
        sessionIdRef.current = sessionId;
        onSessionReady?.(tabId, sessionId, kind);
      })
      .catch((err) => {
        if (isMounted) {
          xterm.write(`\r\n[${isSsh ? "SSH 连接失败" : "创建进程失败"}: ${err.message || String(err)}]\r\n`);
        }
      });

    const inputData = xterm.onData((data) => {
      if (sessionIdRef.current) {
        api.invoke(inputChannel, { sessionId: sessionIdRef.current, data });
      }
    });

    const offOutput = onOutput?.(({ sessionId, data }) => {
      if (sessionId !== sessionIdRef.current) return;
      // Track bracketed paste mode toggles emitted by the shell.
      if (data.includes("\x1b[?2004h")) bracketedPasteRef.current = true;
      if (data.includes("\x1b[?2004l")) bracketedPasteRef.current = false;
      xterm.write(data);
    });

    const offExit = onExit?.(({ sessionId }) => {
      if (sessionId === sessionIdRef.current) {
        xterm.write(`\r\n[${isSsh ? "SSH 连接已断开" : "进程已退出"}]\r\n`);
        sessionIdRef.current = "";
        // SSH 断开后自动关闭 tab；普通终端进程退出保留 tab 让用户查看输出。
        if (isSsh) onSessionExit?.(tabId);
      }
    });

    const pasteFromClipboard = async () => {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const normalized = text.replace(/\r\n|\n/g, "\r");
      if (
        normalized.includes("\r") &&
        !window.confirm("粘贴内容包含多行，确定继续？")
      ) {
        return;
      }
      const pasteData = bracketedPasteRef.current
        ? `\x1b[200~${normalized}\x1b[201~`
        : normalized;
      if (sessionIdRef.current) {
        api.invoke(inputChannel, { sessionId: sessionIdRef.current, data: pasteData });
      }
    };

    xterm.attachCustomKeyEventHandler((event) => {
      if (event.metaKey && event.type === "keydown") {
        if (event.key === "c") {
          const selection = xterm.getSelection();
          if (selection) {
            navigator.clipboard.writeText(selection);
            return false;
          }
        }
        if (event.key === "v") {
          void pasteFromClipboard();
          return false;
        }
        if (event.key === "k") {
          xterm.clear();
          return false;
        }
      }
      return true;
    });

    const el = terminalRef.current;
    const handleMouseUp = (e: MouseEvent) => {
      const selection = xterm.getSelection();
      if (selection?.trim() && el) {
        // copyOnSelect — write to clipboard immediately on selection.
        navigator.clipboard.writeText(selection);
        const rect = el.getBoundingClientRect();
        onSelectionChange?.(tabId, selection, e.clientX - rect.left, e.clientY - rect.top);
      }
    };
    const handleMouseDown = () => {
      onSelectionChange?.(tabId, "", 0, 0);
    };
    // Middle-click paste.
    const handleAuxClick = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        void pasteFromClipboard();
      }
    };
    // File drop — inject quoted absolute paths into the PTY.
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (!files?.length) return;
      const paths: string[] = [];
      for (const f of Array.from(files)) {
        const fp = (f as File & { path?: string }).path;
        if (fp) paths.push(fp);
      }
      if (!paths.length || !sessionIdRef.current) return;
      const quoted = paths.map(quoteForUnix).join(" ");
      api.invoke(inputChannel, { sessionId: sessionIdRef.current, data: quoted });
    };
    const handleDragOver = (e: DragEvent) => { e.preventDefault(); };
    el?.addEventListener("mouseup", handleMouseUp);
    el?.addEventListener("mousedown", handleMouseDown);
    el?.addEventListener("auxclick", handleAuxClick);
    el?.addEventListener("drop", handleDrop);
    el?.addEventListener("dragover", handleDragOver);

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
        api.invoke(resizeChannel, {
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
      el?.removeEventListener("auxclick", handleAuxClick);
      el?.removeEventListener("drop", handleDrop);
      el?.removeEventListener("dragover", handleDragOver);
      resizeObserver.disconnect();
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      const endedSessionId = sessionIdRef.current;
      if (endedSessionId) {
        api.invoke(killChannel, { sessionId: endedSessionId });
      }
      onSessionEnd?.(tabId);
      xterm.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      sessionIdRef.current = "";
    };
  }, [onSessionEnd, onSessionExit, onSessionReady, onSelectionChange, onTitleChange, tabId]);

  // Apply terminal settings live without recreating the terminal.
  // xterm.js 6.0 supports runtime mutation of these options.
  useEffect(() => {
    const xterm = xtermRef.current;
    if (!xterm) return;
    xterm.options.fontSize = terminalSettings.fontSize;
    xterm.options.fontFamily = terminalSettings.fontFamily;
    xterm.options.scrollback = terminalSettings.scrollback;
    xterm.options.cursorStyle = terminalSettings.cursorStyle;
    fitAddonRef.current?.fit();
  }, [terminalSettings]);

  useEffect(() => {
    if (!isActive || !terminalRef.current || !fitAddonRef.current) return;

    const el = terminalRef.current;

    const doFit = () => {
      fitAddonRef.current?.fit();
      const xterm = xtermRef.current;
      if (xterm) {
        // fit() triggers an internal reflow that preserves the viewport's top
        // edge rather than its bottom — call scrollToBottom immediately to
        // correct the apparent "jump to middle" when switching tabs.
        xterm.scrollToBottom();
        requestAnimationFrame(() => {
          // Second pass after reflow settles, then refresh + focus.
          xterm.scrollToBottom();
          xterm.refresh(0, xterm.rows - 1);
          xterm.focus();
        });
      }
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

interface Tab {
  id: string;
  title: string;
  kind: "terminal" | "settings" | "ssh";
  sshHostId?: string;
  sshHost?: SshHost;  // 临时主机（快速连接），不写入 settings.sshHosts
}

export default function TerminalPage({
  isActive = false,
}: {
  isActive?: boolean;
}) {
  const [tabs, setTabs] = useState<Tab[]>(() => [
    { id: `tab_${Date.now()}`, title: "终端 1", kind: "terminal" },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectionTip, setSelectionTip] = useState<{
    text: string;
    x: number;
    y: number;
    tabId: string;
  } | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [sshPickerOpen, setSshPickerOpen] = useState(false);
  const [sshPickerStyle, setSshPickerStyle] = useState<React.CSSProperties>({});
  const [settingsInitialSection, setSettingsInitialSection] = useState<"appearance" | "ssh">("appearance");
  const sshBtnRef = useRef<HTMLButtonElement>(null);
  const nextTabIndex = useRef(2);
  const sessionMapRef = useRef<Map<string, { sessionId: string; kind: "terminal" | "ssh" }>>(new Map());
  const pendingCommandMapRef = useRef<Map<string, string[]>>(new Map());

  // Cross-window settings sync — chat window changes propagate here.
  useEffect(() => {
    const off = api?.onSettingsUpdated?.((next: AppSettings) => {
      setSettings(next);
    });
    return () => off?.();
  }, []);

  const handleSettingsChange = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const pasteCommandToTab = useCallback((tabId: string, command: string) => {
    const session = sessionMapRef.current.get(tabId);
    if (!session) {
      const queue = pendingCommandMapRef.current.get(tabId) ?? [];
      queue.push(command);
      pendingCommandMapRef.current.set(tabId, queue);
      return false;
    }

    const channel = session.kind === "ssh" ? "ssh:input" : "pty:input";
    api.invoke(channel, { sessionId: session.sessionId, data: command });
    return true;
  }, []);

  const flushPendingCommands = useCallback((tabId: string) => {
    const session = sessionMapRef.current.get(tabId);
    if (!session) return;

    const queue = pendingCommandMapRef.current.get(tabId);
    if (!queue?.length) return;

    pendingCommandMapRef.current.delete(tabId);
    const channel = session.kind === "ssh" ? "ssh:input" : "pty:input";
    for (const command of queue) {
      api.invoke(channel, { sessionId: session.sessionId, data: command });
    }
  }, []);

  const handleSessionReady = useCallback(
    (tabId: string, sessionId: string, kind: "terminal" | "ssh") => {
      sessionMapRef.current.set(tabId, { sessionId, kind });
      flushPendingCommands(tabId);
    },
    [flushPendingCommands],
  );

  const handleSessionEnd = useCallback((tabId: string) => {
    sessionMapRef.current.delete(tabId);
    pendingCommandMapRef.current.delete(tabId);
  }, []);

  // SSH 会话退出时自动关闭对应 tab。用 ref 持有 activeTabId 保持稳定 identity，
  // 否则 activeTabId 变化会让 TerminalInstance 的 useEffect 重建终端。
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  const handleSessionExit = useCallback((tabId: string) => {
    setTabs((prev) => {
      const tab = prev.find((t) => t.id === tabId);
      if (tab?.kind !== "ssh") return prev;
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((t) => t.id === tabId);
      const nextTabs = prev.filter((t) => t.id !== tabId);
      if (activeTabIdRef.current === tabId) {
        setActiveTabId(nextTabs[Math.max(0, idx - 1)].id);
      }
      return nextTabs;
    });
  }, []);

  const getActiveSessionId = useCallback(() => {
    return sessionMapRef.current.get(activeTabId)?.sessionId;
  }, [activeTabId]);

  const handleOpenSettings = useCallback(() => {
    const existing = tabs.find((t) => t.kind === "settings");
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const newId = `settings_${Date.now()}`;
    setTabs((prev) => [...prev, { id: newId, title: "设置", kind: "settings" }]);
    setActiveTabId(newId);
  }, [tabs]);

  const handleToggleSshPicker = useCallback(() => {
    setSshPickerOpen((open) => {
      if (!open) {
        const rect = sshBtnRef.current?.getBoundingClientRect();
        if (rect) {
          const PICKER_WIDTH = 320;
          const GAP = 6;
          const MARGIN = 8;
          let left = rect.left;
          if (left + PICKER_WIDTH > window.innerWidth - MARGIN) {
            left = window.innerWidth - MARGIN - PICKER_WIDTH;
          }
          if (left < MARGIN) left = MARGIN;
          const bottom = window.innerHeight - rect.top + GAP;
          setSshPickerStyle({ position: "fixed", left, bottom });
        }
      }
      return !open;
    });
  }, []);

  const handleOpenSshSettings = useCallback(() => {
    setSettingsInitialSection("ssh");
    const existing = tabs.find((t) => t.kind === "settings");
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const newId = `settings_${Date.now()}`;
    setTabs((prev) => [...prev, { id: newId, title: "设置", kind: "settings" }]);
    setActiveTabId(newId);
  }, [tabs]);

  const handleConnectSsh = useCallback((hostId: string) => {
    const host = settings.sshHosts.find((h) => h.id === hostId);
    if (!host) return;
    const newId = `ssh_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setTabs((prev) => [...prev, { id: newId, title: host.name, kind: "ssh", sshHostId: hostId }]);
    setActiveTabId(newId);
    handleSettingsChange({ sshRecent: appendSshRecent(settings.sshRecent, host) });
  }, [settings.sshHosts, settings.sshRecent, handleSettingsChange]);

  // 快速连接：临时主机不持久化，直接挂到 Tab 上建立 SSH 会话
  const handleQuickConnect = useCallback((host: SshHost) => {
    const newId = `ssh_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const title = host.name || `${host.user}@${host.host}`;
    setTabs((prev) => [...prev, { id: newId, title, kind: "ssh", sshHost: host }]);
    setActiveTabId(newId);
    handleSettingsChange({ sshRecent: appendSshRecent(settings.sshRecent, host) });
  }, [settings.sshRecent, handleSettingsChange]);

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

  // OSC 0/2 title reports from the shell (e.g. after `cd` or running a command)
  // are already trimmed + truncated to 30 chars inside TerminalInstance before
  // being forwarded here. Empty deps: stable identity so TerminalInstance's
  // useEffect doesn't re-run.
  const handleTitleChange = useCallback((tabId: string, title: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, title } : t)),
    );
  }, []);

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
    setTabs((prev) => [...prev, { id: newId, title: newTitle, kind: "terminal" as const }]);
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

  // SSH picker：点击外部关闭
  useEffect(() => {
    if (!sshPickerOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const picker = document.querySelector(".ssh-picker");
      const btn = document.querySelector(".terminal-tab-ssh");
      if (picker && !picker.contains(target) && btn && !btn.contains(target)) {
        setSshPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sshPickerOpen]);

  return (
    <div className="terminal-page">
      <div className="terminal-page-left">
        <div className="terminal-instances-wrapper">
          {tabs.map((tab) =>
            tab.kind === "settings" ? (
              <TerminalSettingsTab
                key={tab.id}
                isActive={tab.id === activeTabId && isActive}
                settings={settings}
                onChange={handleSettingsChange}
                onConnectSsh={handleConnectSsh}
                onQuickConnect={handleQuickConnect}
                initialSection={settingsInitialSection}
              />
            ) : (
              <TerminalInstance
                key={tab.id}
                tabId={tab.id}
                isActive={tab.id === activeTabId && isActive}
                sshHost={tab.kind === "ssh" ? (tab.sshHost ?? settings.sshHosts.find((h) => h.id === tab.sshHostId)) : undefined}
                terminalSettings={settings.terminal}
                onSessionReady={handleSessionReady}
                onSessionEnd={handleSessionEnd}
                onSessionExit={handleSessionExit}
                onSelectionChange={handleSelectionChange}
                onTitleChange={handleTitleChange}
              />
            )
          )}
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
          <div className="terminal-tab-ssh-wrap">
            <button
              ref={sshBtnRef}
              type="button"
              className={`terminal-tab-ssh${sshPickerOpen ? " active" : ""}`}
              onClick={handleToggleSshPicker}
              title="SSH 连接"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="20" height="6" rx="1" />
                <rect x="2" y="13" width="20" height="8" rx="1" />
                <line x1="6" y1="17" x2="6" y2="17" />
                <line x1="10" y1="17" x2="10" y2="17" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {sshPickerOpen && (
        <SshConnectionPicker
          style={sshPickerStyle}
          sshHosts={settings.sshHosts}
          sshRecent={settings.sshRecent}
          onConnect={handleConnectSsh}
          onQuickConnect={handleQuickConnect}
          onOpenSettings={handleOpenSshSettings}
          onClose={() => setSshPickerOpen(false)}
        />
      )}

      <TerminalAgentDrawer
        isOpen={drawerOpen}
        onToggle={() => setDrawerOpen((v) => !v)}
        activeTabId={activeTabId}
        getActiveSessionId={getActiveSessionId}
        tabIds={tabs.map((t) => t.id)}
      />

      <button
        type="button"
        className="terminal-settings-toggle"
        onClick={handleOpenSettings}
        title="终端设置"
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
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

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
