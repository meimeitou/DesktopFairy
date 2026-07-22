import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import type { Terminal as TerminalType } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";
import "./TerminalPage.css";
import TerminalAgentDrawer from "../components/terminal/TerminalAgentDrawer";
import TerminalSelectionTooltip from "../components/terminal/TerminalSelectionTooltip";
import TerminalContextMenu from "../components/terminal/TerminalContextMenu";
import TerminalSearchBar from "../components/terminal/TerminalSearchBar";
import TerminalSettingsTab from "../components/terminal/TerminalSettingsTab";
import SshConnectionPicker from "../components/terminal/SshConnectionPicker";
import {
  loadSettings,
  saveSettings,
  type AppSettings,
  type SshHost,
  type SshCredential,
  type TerminalSettings,
} from "../shared/settings";
import { appendSshRecent } from "../shared/terminalSettings";
import type { CursorStyle } from "../shared/terminalSettings";

const api = window.electronAPI;

/** Map our CursorStyle to xterm.js option values (`beam` → `bar`). */
function toXtermCursorStyle(
  style: CursorStyle,
): "block" | "underline" | "bar" {
  return style === "beam" ? "bar" : style;
}

function quoteForUnix(p: string): string {
  return `'${p.replace(/'/g, "'\\''")}'`;
}

function TerminalInstance({
  isActive,
  tabId,
  cwd,
  launchCommand,
  sshHost,
  sshCredentials,
  terminalSettings,
  onSessionReady,
  onSessionEnd,
  onSessionExit,
  onSelectionChange,
  onTitleChange,
  onSearchAddonReady,
  onSearchAddonDispose,
  onContextMenu,
}: {
  isActive: boolean;
  tabId: string;
  cwd?: string;
  launchCommand?: string;
  sshHost?: SshHost;
  sshCredentials?: SshCredential[];
  terminalSettings: TerminalSettings;
  onSessionReady?: (tabId: string, sessionId: string, kind: "terminal" | "ssh") => void;
  onSessionEnd?: (tabId: string) => void;
  onSessionExit?: (tabId: string) => void;
  onSelectionChange?: (tabId: string, text: string, x: number, y: number) => void;
  onTitleChange?: (tabId: string, title: string) => void;
  onSearchAddonReady?: (tabId: string, xterm: TerminalType, searchAddon: SearchAddon) => void;
  onSearchAddonDispose?: (tabId: string) => void;
  onContextMenu?: (tabId: string, x: number, y: number) => void;
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
      cursorStyle: toXtermCursorStyle(ts.cursorStyle),
      allowProposedApi: true, // SearchAddon decorations use registerDecoration (proposed API)
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
    // SearchAddon: Cmd+F 搜索终端缓冲区（含 scrollback）。装饰高亮所有匹配，
    // 柿色标当前匹配。registry 由父组件持有，搜索弹框通过它访问活跃 tab 的 addon。
    const searchAddon = new SearchAddon();
    xterm.loadAddon(searchAddon);
    onSearchAddonReady?.(tabId, xterm, searchAddon);
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

    // renderer 侧解析 credentialId → 实际 password/privateKeyPath
    // main 进程(sshService.cjs)不感知凭据库，只接收解析后的值。
    const resolveCred = (id?: string): { password?: string; privateKeyPath?: string } => {
      if (!id) return {};
      const c = sshCredentials?.find((x) => x.id === id);
      return c ? { password: c.password, privateKeyPath: c.privateKeyPath } : {};
    };
    const targetCred = resolveCred(sshHost?.credentialId);
    const jumpCred = resolveCred(sshHost?.proxyJumpCredentialId);

    const createParams = isSsh
      ? {
          host: sshHost!.host,
          port: sshHost!.port,
          user: sshHost!.user,
          authMethod: sshHost!.authMethod,
          password: targetCred.password,
          privateKeyPath: targetCred.privateKeyPath,
          proxyJump: sshHost!.proxyJump,
          proxyJumpAuthMethod: sshHost!.proxyJumpAuthMethod,
          proxyJumpPassword: jumpCred.password,
          proxyJumpPrivateKeyPath: jumpCred.privateKeyPath,
          cols,
          rows,
        }
      : {
          cols,
          rows,
          cwd: cwd || undefined,
          initialCommand: launchCommand ? `${launchCommand}\r` : undefined,
        };

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
      if (sessionId !== sessionIdRef.current) return;
      const autoClose = isSsh || Boolean(launchCommand);
      if (!autoClose) {
        xterm.write("\r\n[进程已退出]\r\n");
      } else if (isSsh) {
        xterm.write("\r\n[SSH 连接已断开]\r\n");
      }
      sessionIdRef.current = "";
      onSessionEnd?.(tabId);
      if (autoClose) onSessionExit?.(tabId);
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
          // 必须显式 preventDefault：attachCustomKeyEventHandler 返回 false
          // 只阻止 xterm 自身的键盘处理，不会阻止浏览器原生 paste 事件。
          // 否则浏览器仍会触发 paste → xterm onData → 再次写入 PTY，导致粘贴双份。
          event.preventDefault();
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
    // 右键上下文菜单 — 拦截浏览器默认行为，把坐标交给父组件渲染菜单。
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      onContextMenu?.(tabId, e.clientX, e.clientY);
    };
    el?.addEventListener("mouseup", handleMouseUp);
    el?.addEventListener("mousedown", handleMouseDown);
    el?.addEventListener("auxclick", handleAuxClick);
    el?.addEventListener("drop", handleDrop);
    el?.addEventListener("dragover", handleDragOver);
    el?.addEventListener("contextmenu", handleContextMenu);

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
      el?.removeEventListener("contextmenu", handleContextMenu);
      resizeObserver.disconnect();
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      const endedSessionId = sessionIdRef.current;
      if (endedSessionId) {
        api.invoke(killChannel, { sessionId: endedSessionId });
      }
      onSessionEnd?.(tabId);
      // 先从父组件 registry 注销，再 dispose xterm。父组件若正持有该 tab 的
      // searchAddon 引用（例如搜索弹框打开中），需要在此之前清掉，避免 dispose
      // 后调用已失效的 addon。
      onSearchAddonDispose?.(tabId);
      xterm.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      sessionIdRef.current = "";
    };
  }, [onSessionEnd, onSessionExit, onSessionReady, onSelectionChange, onTitleChange, tabId, onSearchAddonReady, onSearchAddonDispose, onContextMenu]);

  // Apply terminal settings live without recreating the terminal.
  // xterm.js 6.0 supports runtime mutation of these options.
  useEffect(() => {
    const xterm = xtermRef.current;
    if (!xterm) return;
    xterm.options.fontSize = terminalSettings.fontSize;
    xterm.options.fontFamily = terminalSettings.fontFamily;
    xterm.options.scrollback = terminalSettings.scrollback;
    xterm.options.cursorStyle = toXtermCursorStyle(terminalSettings.cursorStyle);
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
  cwd?: string;
  launchCommand?: string;
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
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tabId: string;
  } | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  // Mirror settings in a ref so handleSettingsChange (stable callback) can
  // read the latest value without a stale closure or re-creating on every change.
  const appSettingsRef = useRef(settings);
  useEffect(() => {
    appSettingsRef.current = settings;
  }, [settings]);
  const [sshPickerOpen, setSshPickerOpen] = useState(false);
  const [sshPickerStyle, setSshPickerStyle] = useState<React.CSSProperties>({});
  const [settingsInitialSection, setSettingsInitialSection] = useState<"appearance" | "ssh">("appearance");
  const sshBtnRef = useRef<HTMLButtonElement>(null);
  const nextTabIndex = useRef(2);
  const sessionMapRef = useRef<Map<string, { sessionId: string; kind: "terminal" | "ssh" }>>(new Map());
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const pendingCommandMapRef = useRef<Map<string, string[]>>(new Map());
  // SearchAddon registry — 每个 tab 创建终端时注册 { xterm, searchAddon }，
  // 卸载时移除。Cmd+F 时从 registry 取当前 tab 的 addon 引用存入 state，
  // 搜索弹框从 state 读（不在渲染期读 ref，避免 react-hooks/refs 警告）。
  // registry 用 ref：xterm 实例不可序列化，且注册/注销不应触发重渲染。
  const searchRegistryRef = useRef<Map<string, { xterm: TerminalType; searchAddon: SearchAddon }>>(new Map());
  const [searchEntry, setSearchEntry] = useState<{ xterm: TerminalType; searchAddon: SearchAddon } | null>(null);

  // Cross-window settings sync — chat window changes propagate here.
  useEffect(() => {
    const off = api?.onSettingsUpdated?.((incoming) => {
      setSettings(incoming as unknown as AppSettings);
    });
    return () => off?.();
  }, []);

  const handleSettingsChange = useCallback((patch: Partial<AppSettings>) => {
    const next = { ...appSettingsRef.current, ...patch };
    setSettings(next);
    void saveSettings(next).then((r) => {
      if (!r.persisted) {
        alert(
          `设置未能保存到磁盘${r.error ? `：${r.error}` : "，重启后可能丢失"}`,
        );
      }
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
      const autoClose = tab?.kind === "ssh" || Boolean(tab?.launchCommand);
      if (!autoClose) return prev;

      if (prev.length <= 1) {
        const newId = `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        setActiveTabId(newId);
        return [{ id: newId, title: "终端 1", kind: "terminal" as const }];
      }

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
      setContextMenu(null);
      setSelectionTip({ text, x, y, tabId });
    },
    [],
  );

  // 右键菜单：与选区提示互斥。空依赖保证 identity 稳定，避免
  // TerminalInstance 的终端创建 useEffect 因回调变化而重跑。
  const handleContextMenu = useCallback(
    (tabId: string, cx: number, cy: number) => {
      setSelectionTip(null);
      setContextMenu({ x: cx, y: cy, tabId });
    },
    [],
  );

  // 右键“搜索”：复用 Cmd+F 的路径，从 registry 取当前 tab 的 searchAddon。
  const handleContextSearch = useCallback(() => {
    if (!contextMenu) return;
    const entry = searchRegistryRef.current.get(contextMenu.tabId);
    if (entry) setSearchEntry(entry);
  }, [contextMenu]);

  // 右键“密码凭证”：将所选凭据的密码写入当前 tab 的会话输入
  // （与 onData 同路 pty:input / ssh:input），不带回车，由用户自行提交。
  // 菜单按钮点击会夺走焦点，填完后把焦点还给终端，便于用户继续输入。
  const handleContextFillPassword = useCallback(
    (cred: SshCredential) => {
      if (!contextMenu) return;
      pasteCommandToTab(contextMenu.tabId, cred.password || "");
      requestAnimationFrame(() => {
        searchRegistryRef.current.get(contextMenu.tabId)?.xterm.focus();
      });
    },
    [contextMenu, pasteCommandToTab],
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

  // 空依赖：稳定 identity，避免触发 TerminalInstance 的终端创建 useEffect 重跑。
  const handleSearchAddonReady = useCallback(
    (tabId: string, xterm: TerminalType, searchAddon: SearchAddon) => {
      searchRegistryRef.current.set(tabId, { xterm, searchAddon });
    },
    [],
  );

  const handleSearchAddonDispose = useCallback((tabId: string) => {
    searchRegistryRef.current.delete(tabId);
  }, []);

  // 切换 tab 时关闭搜索：不同 tab 的 xterm 实例不同，保留打开会引用到
  // 旧 tab 的 searchAddon，高亮也留在旧 tab 里。用"渲染期对比前值"模式
  // 调整 state（React 官方推荐的 prop 变化重置写法），避免 effect 内 setState。
  const [prevActiveTabId, setPrevActiveTabId] = useState(activeTabId);
  if (activeTabId !== prevActiveTabId) {
    setPrevActiveTabId(activeTabId);
    setSearchEntry(null);
  }

  useEffect(() => {
    const handler = (e: Event) => {
      const { command } = (e as CustomEvent<{ command?: string }>).detail ?? {};
      if (!command) return;
      pasteCommandToTab(activeTabId, command);
    };
    window.addEventListener("terminal:run-command", handler);
    return () => window.removeEventListener("terminal:run-command", handler);
  }, [activeTabId, pasteCommandToTab]);

  const openCliTab = useCallback(
    (detail: { cwd: string; command: string; title?: string }) => {
      const { cwd, command, title } = detail;
      if (!cwd || !command) return;
      const newId = `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const newTitle = title?.trim() || `CLI ${nextTabIndex.current++}`;
      setTabs((prev) => [
        ...prev,
        { id: newId, title: newTitle, kind: "terminal" as const, cwd, launchCommand: command },
      ]);
      setActiveTabId(newId);
    },
    [],
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ cwd?: string; command?: string; title?: string }>).detail;
      if (!detail?.cwd || !detail?.command) return;
      openCliTab({
        cwd: detail.cwd,
        command: detail.command,
        title: detail.title,
      });
    };
    window.addEventListener("terminal:launch-cli", handler);
    return () => window.removeEventListener("terminal:launch-cli", handler);
  }, [openCliTab]);

  const handleAddTab = useCallback(() => {
    const newId = `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const newTitle = `终端 ${nextTabIndex.current++}`;
    setTabs((prev) => [...prev, { id: newId, title: newTitle, kind: "terminal" as const }]);
    setActiveTabId(newId);
  }, []);

  const closeTabById = useCallback((id: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((t) => t.id === id);
      const nextTabs = prev.filter((t) => t.id !== id);
      if (activeTabIdRef.current === id) {
        setActiveTabId(nextTabs[Math.max(0, idx - 1)].id);
      }
      return nextTabs;
    });
  }, []);

  const requestCloseTab = useCallback(async (id: string) => {
    const tab = tabsRef.current.find((t) => t.id === id);
    if (!tab) return;
    if (tab.kind === "settings") {
      closeTabById(id);
      return;
    }
    const session = sessionMapRef.current.get(id);
    if (session) {
      const channel = session.kind === "ssh" ? "ssh:busy" : "pty:busy";
      try {
        const result = (await api.invoke(channel, { sessionId: session.sessionId })) as {
          busy?: boolean;
          comm?: string;
        };
        if (result?.busy) {
          const detail = result.comm
            ? `「${result.comm}」正在运行，`
            : "有命令正在执行，";
          if (!window.confirm(`${detail}确定关闭此终端标签页吗？`)) return;
        }
      } catch {
        if (!window.confirm("无法确认终端状态，确定关闭此标签页吗？")) return;
      }
    }
    closeTabById(id);
  }, [closeTabById]);

  const handleCloseTab = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      void requestCloseTab(id);
    },
    [requestCloseTab],
  );

  const handleCloseActiveTab = useCallback(() => {
    void requestCloseTab(activeTabId);
  }, [activeTabId, requestCloseTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;

      if (e.metaKey && e.key === "t") {
        e.preventDefault();
        handleAddTab();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "w") {
        e.preventDefault();
        void handleCloseActiveTab();
      } else if (e.metaKey && e.key === "f") {
        // 仅在当前 tab 是终端/SSH 且已注册 searchAddon 时打开。
        // 设置 tab 为 settings 时无注册项，Cmd+F 不响应。
        e.preventDefault();
        const entry = searchRegistryRef.current.get(activeTabId);
        if (entry) setSearchEntry(entry);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, handleAddTab, handleCloseActiveTab, activeTabId]);

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
                cwd={tab.cwd}
                launchCommand={tab.launchCommand}
                sshHost={tab.kind === "ssh" ? (tab.sshHost ?? settings.sshHosts.find((h) => h.id === tab.sshHostId)) : undefined}
                sshCredentials={settings.sshCredentials}
                terminalSettings={settings.terminal}
                onSessionReady={handleSessionReady}
                onSessionEnd={handleSessionEnd}
                onSessionExit={handleSessionExit}
                onSelectionChange={handleSelectionChange}
                onTitleChange={handleTitleChange}
                onSearchAddonReady={handleSearchAddonReady}
                onSearchAddonDispose={handleSearchAddonDispose}
                onContextMenu={handleContextMenu}
              />
            )
          )}
          {searchEntry && (
            <TerminalSearchBar
              xterm={searchEntry.xterm}
              searchAddon={searchEntry.searchAddon}
              onClose={() => setSearchEntry(null)}
            />
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
          {contextMenu && contextMenu.tabId === activeTabId && (
            <TerminalContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              credentials={settings.sshCredentials}
              onSearch={handleContextSearch}
              onFillPassword={handleContextFillPassword}
              onClose={() => setContextMenu(null)}
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
          <button
            type="button"
            className="terminal-tab-settings"
            onClick={handleOpenSettings}
            title="终端设置"
          >
            <svg
              width="14"
              height="14"
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
