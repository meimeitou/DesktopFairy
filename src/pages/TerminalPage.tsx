import { readTerminalAgentRecovery, forgetTerminalAgent } from "../shared/terminalAgentRecovery";
import { Button } from "@cherrystudio/ui";
import { Smile } from "lucide-react";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Terminal } from "@xterm/xterm";
import type { Terminal as TerminalType } from "@xterm/xterm";
import { useConfirm } from "../hooks/useConfirm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import "@xterm/xterm/css/xterm.css";
import "./TerminalPage.css";
import AgentSettingsModal from "../components/agents/AgentSettingsModal";
import TerminalAgentDrawer from "../components/terminal/TerminalAgentDrawer";
import TerminalSelectionTooltip from "../components/terminal/TerminalSelectionTooltip";
import TerminalContextMenu from "../components/terminal/TerminalContextMenu";
import TerminalSearchBar from "../components/terminal/TerminalSearchBar";
import TerminalSettingsTab, {
  type Section as TerminalSettingsSection,
} from "../components/terminal/TerminalSettingsTab";
import HostChatPanel from "../components/terminal/HostChatPanel";
import TerminalSidebar from "../components/terminal/TerminalSidebar";
import TerminalHostPicker from "../components/terminal/TerminalHostPicker";
import {
  buildSidebarGroups,
  type SidebarGroup,
  type SidebarItem,
  type Tab,
} from "../components/terminal/terminalSidebarGroups";
import {
  type AppSettings,
  type SshHost,
  type SshCredential,
  type TerminalSettings,
} from "../shared/settings";
import {
  setSettings as commitAppSettings,
  useSettings,
} from "../shared/settingsStore";
import {
  appendSshRecent,
  resolveSshRecentTarget,
  type SshRecentEntry,
} from "../shared/terminalSettings";
import type { CursorStyle } from "../shared/terminalSettings";
import TerminalEmptyState from "../components/terminal/TerminalEmptyState";
import type { ChatTopic } from "../shared/chatSession";
import { takeTerminalCommands } from "../shared/panelHandoff";
import { TERMINAL_ASSISTANT_ID, findAgentById } from "../shared/agent";
import { abortTopicStream } from "../services/aiTransport/IpcChatTransport";
import { pasteTerminalText } from "../shared/terminalPaste";

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
  savedHostId,
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
  requestPasteConfirm,
}: {
  isActive: boolean;
  tabId: string;
  cwd?: string;
  launchCommand?: string;
  sshHost?: SshHost;
  savedHostId?: string;
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
  requestPasteConfirm: (normalized: string) => Promise<boolean>;
}) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string>("");
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(isActive);
  const pendingOutputRef = useRef("");
  isActiveRef.current = isActive;
  // Use a ref for settings so the main useEffect (terminal creation) doesn't
  // re-run on every settings change. Live updates are applied in a separate
  // useEffect below.
  const settingsRef = useRef(terminalSettings);
  settingsRef.current = terminalSettings;

  useEffect(() => {
    if (!terminalRef.current) return;

    const isSsh = !!sshHost;
    const ts = settingsRef.current;

    const css = getComputedStyle(document.documentElement);
    const token = (name: string) => css.getPropertyValue(name).trim();
    const xterm = new Terminal({
      cursorBlink: true,
      fontSize: ts.fontSize,
      fontFamily: ts.fontFamily,
      scrollback: ts.scrollback,
      cursorStyle: toXtermCursorStyle(ts.cursorStyle),
      allowProposedApi: true, // SearchAddon decorations + unicode.activeVersion
      // Ambiguous-width glyphs (roman numerals, some CJK punctuation) need
      // horizontal rescale for GB18030-style column alignment.
      rescaleOverlappingGlyphs: true,
      theme: {
        background: token("--code-bg") || "#323232",
        foreground: token("--code-fg") || "#ededed",
        cursor: token("--code-cursor") || "#3ecf8e",
        selectionBackground: "rgba(62, 207, 142, 0.45)",
      },
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    // Unicode 11 East-Asian Width: CJK, emoji, and newer wide chars occupy
    // 2 cells. Default Unicode 6 under-counts them and overlaps columns.
    const unicode11 = new Unicode11Addon();
    xterm.loadAddon(unicode11);
    xterm.unicode.activeVersion = "11";
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
      const bellEl = shellRef.current;
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
          savedHostId,
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
      if (!isActiveRef.current) {
        pendingOutputRef.current += data;
        return;
      }
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
      if (sessionIdRef.current) {
        await pasteTerminalText(xterm, text, requestPasteConfirm);
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

    const el = shellRef.current;
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
        const fp =
          api.getPathForFile?.(f) || (f as File & { path?: string }).path;
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

    const xterm = xtermRef.current;
    if (xterm && pendingOutputRef.current) {
      xterm.write(pendingOutputRef.current);
      pendingOutputRef.current = "";
    }

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
      ref={shellRef}
      className={`terminal-instance${isActive ? " active" : ""}`}
    >
      {/* xterm 必须挂在无 padding 的内容盒上。FitAddon 读的是父元素 border-box，
          padding 留在外层时画面会按外框尺寸布局，再被内边距挤偏。 */}
      <div ref={terminalRef} className="terminal-xterm-host" />
    </div>
  );
}

export default function TerminalPage({
  isActive = false,
}: {
  isActive?: boolean;
}) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [awaitingReconnect, setAwaitingReconnect] = useState<Set<string>>(new Set());
  const recoveredTabIds = useRef(new Set<string>());
  useEffect(() => {
    let active = true;
    void (async () => {
      const recovered: Tab[] = [];
      for (const row of readTerminalAgentRecovery()) {
        try {
          const snapshot = await api.invoke('ai:stream_inputs', { topicId: `terminal:${row.tab.id}` }) as import('../shared/agentInputs').AgentInputSnapshot;
          if (snapshot.items.some((r) => r.status === 'pending')) recovered.push(row.tab);
          else forgetTerminalAgent(row.tab.id);
        } catch { /* Retry restoration on the next mount if IPC is temporarily unavailable. */ }
      }
      if (!active || !recovered.length) return;
      for (const tab of recovered) recoveredTabIds.current.add(tab.id);
      setAwaitingReconnect((prev) => new Set([...prev, ...recovered.map((tab) => tab.id)]));
      setTabs((prev) => [...prev, ...recovered.filter((r) => !prev.some((t) => t.id === r.id))]);
      setActiveTabId((prev) => prev || recovered[0].id);
      setDrawerOpen(true);
    })();
    return () => { active = false; };
  }, []);
  const [settingsSectionRequest, setSettingsSectionRequest] = useState<{
    section: TerminalSettingsSection;
    nonce: number;
  }>({ section: "appearance", nonce: 0 });
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem("df_terminal_sidebar_collapsed") === "1",
  );
  const [hostEditRequest, setHostEditRequest] = useState<{ hostId: string; nonce: number }>({
    hostId: "",
    nonce: 0,
  });
  const [topics, setTopics] = useState<ChatTopic[]>([]);
  /** 建会话期间忽略重复触发：双击「新建对话」会留下两个空 topic。 */
  const creatingTopicRef = useRef(false);
  const [activityAt, setActivityAt] = useState<Record<string, number>>({});
  const [topicStatus, setTopicStatus] = useState<
    Record<string, { streaming: boolean; awaiting: boolean }>
  >({});
  const [picker, setPicker] = useState<{
    mode: "terminal" | "conversation";
    style: React.CSSProperties;
  } | null>(null);
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
  const settings = useSettings();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const nextTabIndex = useRef(1);
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

  const handleSettingsChange = useCallback((patch: Partial<AppSettings>) => {
    commitAppSettings((prev) => ({ ...prev, ...patch }));
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

  /** 唯一激活入口：切 tab 同时记录活跃时间，供左栏按主机分组排序。 */
  const activateTab = useCallback((id: string) => {
    setActiveTabId(id);
    setActivityAt((prev) => ({ ...prev, [id]: Date.now() }));
  }, []);

  /** 纯过滤：只返回新列表。副作用统一由 closeTabById 处理，
      避免在 setTabs 的 updater 里调用 setState（StrictMode 会双调用 updater）。 */
  const removeTabFromList = useCallback((prev: Tab[], id: string): Tab[] => {
    return prev.some((t) => t.id === id)
      ? prev.filter((t) => t.id !== id)
      : prev;
  }, []);

  const closeTabById = useCallback((id: string) => {
    const prev = tabsRef.current;
    const idx = prev.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const nextTabs = prev.filter((t) => t.id !== id);
    const closed = prev[idx];
    forgetTerminalAgent(id);
    recoveredTabIds.current.delete(id);
    setAwaitingReconnect((prev) => { const next = new Set(prev); next.delete(id); return next; });
    if (closed.kind === "terminal" || closed.kind === "ssh") {
      void api.invoke("ai:terminal:clear_sudo", { tabId: id });
    }
    setTabs((current) => removeTabFromList(current, id));

    // 设置页每次重新打开都是新的：清掉上一次的跳转/编辑请求，
    // 否则挂载时 effect 会拿着旧 nonce 再弹一次编辑窗。
    if (closed.kind === "settings") {
      setHostEditRequest({ hostId: "", nonce: 0 });
      setSettingsSectionRequest({ section: "appearance", nonce: 0 });
    }

    if (closed.topicId) {
      const topicId = closed.topicId;
      setTopicStatus((statuses) => {
        if (!(topicId in statuses)) return statuses;
        const next = { ...statuses };
        delete next[topicId];
        return next;
      });
    }
    setActivityAt((activity) => {
      if (!(id in activity)) return activity;
      const next = { ...activity };
      delete next[id];
      return next;
    });

    const hasSession = nextTabs.some(
      (t) => t.kind === "terminal" || t.kind === "ssh",
    );
    if (!hasSession) {
      setDrawerOpen(false);
      setSearchEntry(null);
      setSelectionTip(null);
      setContextMenu(null);
    }
    if (nextTabs.length === 0) {
      setActiveTabId("");
      setPicker(null);
      nextTabIndex.current = 1;
      return;
    }
    if (activeTabIdRef.current === id) {
      activateTab(nextTabs[Math.max(0, idx - 1)].id);
    }
  }, [activateTab]);

  const handleSessionExit = useCallback((tabId: string) => {
    const tab = tabsRef.current.find((t) => t.id === tabId);
    if (!tab) return;
    if (recoveredTabIds.current.has(tabId)) {
      setAwaitingReconnect((prev) => new Set([...prev, tabId]));
      return;
    }
    const autoClose = tab.kind === "ssh" || Boolean(tab.launchCommand);
    if (!autoClose) return;
    closeTabById(tabId);
  }, [closeTabById]);

  const getActiveSessionId = useCallback(() => {
    return sessionMapRef.current.get(activeTabId)?.sessionId;
  }, [activeTabId]);

  const handleOpenSettings = useCallback(
    (section?: TerminalSettingsSection) => {
      if (section) {
        setSettingsSectionRequest((prev) => ({ section, nonce: prev.nonce + 1 }));
      }
      const existing = tabsRef.current.find((t) => t.kind === "settings");
      if (existing) {
        activateTab(existing.id);
        return;
      }
      const newId = `settings_${Date.now()}`;
      setTabs((prev) => [...prev, { id: newId, title: "设置", kind: "settings" }]);
      activateTab(newId);
    },
    [activateTab],
  );

  // 打开终端助手设置弹窗：与抽屉同款兜底（terminalAgentId 失效时回退 builtinRole）。
  const terminalAgentId =
    findAgentById(settings.agents, settings.terminalAgentId)?.id ??
    settings.agents.find((a) => a.builtinRole === "terminal-assistant")?.id ??
    null;
  const [agentSettingsOpen, setAgentSettingsOpen] = useState(false);
  const [editingTopicAgentId, setEditingTopicAgentId] = useState<string | null>(null);

  // 助手抽屉右上角的齿轮：原地打开助手设置弹窗。
  const handleOpenTerminalAgentSettings = useCallback(() => {
    setAgentSettingsOpen(true);
  }, []);

  // 侧栏分组标题的编辑按钮：跳到终端设置的 SSH 分区并弹出该主机的编辑窗。
  const handleEditHostFromSidebar = useCallback(
    (hostId: string) => {
      setHostEditRequest((prev) => ({ hostId, nonce: prev.nonce + 1 }));
      handleOpenSettings("ssh");
    },
    [handleOpenSettings],
  );

  const handleConnectSsh = useCallback((hostId: string) => {
    const host = settings.sshHosts.find((h) => h.id === hostId);
    if (!host) return;
    const newId = `ssh_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setTabs((prev) => [...prev, { id: newId, title: host.name, kind: "ssh", sshHostId: hostId }]);
    activateTab(newId);
    handleSettingsChange({ sshRecent: appendSshRecent(settings.sshRecent, host) });
  }, [settings.sshHosts, settings.sshRecent, handleSettingsChange, activateTab]);

  // 快速连接：临时主机不持久化，直接挂到 Tab 上建立 SSH 会话
  const handleQuickConnect = useCallback((host: SshHost) => {
    const newId = `ssh_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const title = host.name || `${host.user}@${host.host}`;
    setTabs((prev) => [...prev, { id: newId, title, kind: "ssh", sshHost: host }]);
    activateTab(newId);
    handleSettingsChange({ sshRecent: appendSshRecent(settings.sshRecent, host) });
  }, [settings.sshRecent, handleSettingsChange, activateTab]);

  const handleOpenRecent = useCallback(
    (entry: SshRecentEntry) => {
      const target = resolveSshRecentTarget(entry, settings.sshHosts);
      if (target.type === "saved") {
        handleConnectSsh(target.id);
        return;
      }
      handleQuickConnect(target.host);
    },
    [settings.sshHosts, handleConnectSsh, handleQuickConnect],
  );

  const refreshTopics = useCallback(async () => {
    // 终端侧栏同时列出主机对话与本机对话，因此要全量 topic 列表。
    try {
      const store = (await api.invoke("chat:topics:list")) as {
        topics?: ChatTopic[];
      };
      // 响应结构不对时不要当成「没有任何对话」——清理 effect 会据此把已打开的
      // 对话标签全部关掉。返回 null 表示本次结果不可信，调用方保持现状。
      if (!Array.isArray(store?.topics)) return null;
      setTopics(store.topics);
      return store.topics;
    } catch {
      // 读失败同样保持现状，避免清空列表后连带关掉标签。
      return null;
    }
  }, []);

  // 主机增删后重新拉取对话列表（主进程会级联删除该主机的对话）。
  const sshHostsKey = settings.sshHosts.map((h) => h.id).join(",");
  useEffect(() => {
    void refreshTopics();
  }, [sshHostsKey, refreshTopics]);

  const openConversationTab = useCallback(
    (topic: ChatTopic) => {
      const existing = tabsRef.current.find(
        (t) => t.kind === "host-chat" && t.topicId === topic.id,
      );
      if (existing) {
        activateTab(existing.id);
        return;
      }
      const newId = `hostchat_${Date.now()}`;
      setTabs((prev) => [
        ...prev,
        {
          id: newId,
          title: topic.name || "新对话",
          kind: "host-chat",
          topicId: topic.id,
        },
      ]);
      activateTab(newId);
    },
    [activateTab],
  );

  const handleNewConversation = useCallback(
    async (hostId: string) => {
      if (creatingTopicRef.current) return;
      creatingTopicRef.current = true;
      try {
        const agent = findAgentById(settings.agents, settings.terminalAgentId || TERMINAL_ASSISTANT_ID);
        const result = (await api.invoke("chat:topics:create", {
          name: "",
          agentId: settings.terminalAgentId || TERMINAL_ASSISTANT_ID,
          chatMode: agent?.chatMode ?? "normal",
          knowledgeBaseIds: agent?.knowledgeBaseIds || [],
          hostId,
        })) as { ok?: boolean; topic?: ChatTopic };
        if (!result?.ok || !result.topic) {
          // 主机可能已被删除：刷新一次让列表收敛，不建标签。
          void refreshTopics();
          return;
        }
        await refreshTopics();
        openConversationTab(result.topic);
        window.dispatchEvent(new CustomEvent("chat:topics-changed"));
      } finally {
        creatingTopicRef.current = false;
      }
    },
    [openConversationTab, refreshTopics, settings.terminalAgentId, settings.agents],
  );

  // 本机对话：使用统一终端助手，带 origin="terminal" 标记，只属于终端页。
  const handleNewLocalConversation = useCallback(async () => {
    if (creatingTopicRef.current) return;
    creatingTopicRef.current = true;
    try {
      const terminalAgent = findAgentById(settings.agents, settings.terminalAgentId || TERMINAL_ASSISTANT_ID);
      const result = (await api.invoke("chat:topics:create", {
        name: "",
        agentId: settings.terminalAgentId || TERMINAL_ASSISTANT_ID,
        chatMode: terminalAgent?.chatMode ?? "normal",
        // 标记归属：这类会话只出现在终端页「本机」分组，不进智能体列表。
        origin: "terminal",
        // 与聊天页新建一致：把智能体默认知识库固化到会话上，面板据此发送。
        ...(terminalAgent && terminalAgent.knowledgeBaseIds.length > 0
          ? { knowledgeBaseIds: terminalAgent.knowledgeBaseIds }
          : {}),
      })) as { ok?: boolean; topic?: ChatTopic };
      if (!result?.ok || !result.topic) {
        void refreshTopics();
        return;
      }
      await refreshTopics();
      openConversationTab(result.topic);
      window.dispatchEvent(new CustomEvent("chat:topics-changed"));
    } finally {
      creatingTopicRef.current = false;
    }
  }, [openConversationTab, refreshTopics, settings.agents, settings.terminalAgentId]);

  // 聊天页与终端页各挂一份 topics（两页都 keep-alive），改动后互相通知刷新。
  useEffect(() => {
    const onChanged = () => {
      void refreshTopics();
    };
    window.addEventListener("chat:topics-changed", onChanged);
    return () => window.removeEventListener("chat:topics-changed", onChanged);
  }, [refreshTopics]);

  const handleDeleteConversation = useCallback(
    async (topic: ChatTopic) => {
      const ok = await confirm({
        title: "删除对话",
        content: `删除后无法恢复，确定删除「${topic.name || "新对话"}」？`,
        okText: "删除",
        danger: true,
      });
      if (!ok) return;
      abortTopicStream(topic.id);
      await api.invoke("chat:topics:delete", topic.id);
      const tab = tabsRef.current.find(
        (t) => t.kind === "host-chat" && t.topicId === topic.id,
      );
      if (tab) closeTabById(tab.id);
      await refreshTopics();
      window.dispatchEvent(new CustomEvent("chat:topics-changed"));
    },
    [closeTabById, confirm, refreshTopics],
  );

  // 对话被删 / 主机被删 / 会话不属于终端页后，关掉指向已消失资源的标签。
  useEffect(() => {
    const topicById = new Map(topics.map((t) => [t.id, t]));
    const hostIds = new Set(settings.sshHosts.map((h) => h.id));
    const doomed = tabsRef.current.filter((tab) => {
      if (tab.kind === "host-chat") {
        const topic = tab.topicId ? topicById.get(tab.topicId) : undefined;
        if (!topic) return true;
        // 聊天页会话（无 host 且非终端页创建）不该占用终端标签。
        return !topic.host && topic.origin !== "terminal";
      }
      if (tab.kind === "ssh" && tab.sshHostId) return !hostIds.has(tab.sshHostId);
      return false;
    });
    // 走统一关闭入口：它负责 topicStatus / activityAt / 抽屉与浮层的复位。
    for (const tab of doomed) closeTabById(tab.id);
  }, [topics, settings.sshHosts, closeTabById]);

  // 兜底：activeTabId 失效（标签被裁剪/关闭）时落到最后一个标签。
  useEffect(() => {
    if (activeTabId && tabs.some((t) => t.id === activeTabId)) return;
    if (tabs.length === 0) {
      if (activeTabId) setActiveTabId("");
      return;
    }
    setActiveTabId(tabs[tabs.length - 1].id);
  }, [tabs, activeTabId]);

  const handleTopicStatus = useCallback(
    (topicId: string, status: { streaming: boolean; awaiting: boolean }) => {
      setTopicStatus((prev) => {
        const cur = prev[topicId];
        if (cur?.streaming === status.streaming && cur?.awaiting === status.awaiting) {
          return prev;
        }
        return { ...prev, [topicId]: status };
      });
    },
    [],
  );

  const handleTopicRenamed = useCallback((topicId: string, name: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.topicId === topicId ? { ...t, title: name } : t)),
    );
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, name } : t)),
    );
    void api.invoke("chat:topics:rename", { topicId, name });
  }, []);

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
    const flush = () => {
      if (!activeTabId) return;
      for (const command of takeTerminalCommands()) {
        pasteCommandToTab(activeTabId, command);
      }
    };
    window.addEventListener("terminal:run-command", flush);
    flush();
    return () => window.removeEventListener("terminal:run-command", flush);
  }, [activeTabId, pasteCommandToTab]);

  const handleAddTab = useCallback(() => {
    const newId = `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const newTitle = `终端 ${nextTabIndex.current++}`;
    setTabs((prev) => [...prev, { id: newId, title: newTitle, kind: "terminal" as const }]);
    activateTab(newId);
  }, [activateTab]);

  const requestCloseTab = useCallback(async (id: string) => {
    const tab = tabsRef.current.find((t) => t.id === id);
    if (!tab) return;
    if (tab.kind === "host-chat") {
      // Closing the tab only detaches; the background stream keeps running.
      closeTabById(id);
      return;
    }
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
          if (!(await confirm({ title: "关闭终端", content: `${detail}确定关闭此终端标签页吗？` }))) return;
        }
      } catch {
        if (!(await confirm({ title: "关闭终端", content: "无法确认终端状态，确定关闭此标签页吗？" }))) return;
      }
    }
    closeTabById(id);
  }, [closeTabById, confirm]);

  const handleNewTerminalForGroup = useCallback(
    (group: SidebarGroup) => {
      if (group.kind === "local") handleAddTab();
      else if (group.kind === "host" && group.hostId) handleConnectSsh(group.hostId);
      else if (group.kind === "quick" && group.quickHost) handleQuickConnect(group.quickHost);
    },
    [handleAddTab, handleConnectSsh, handleQuickConnect],
  );

  const handleNewConversationForGroup = useCallback(
    (group: SidebarGroup) => {
      // 主机已删（无 hostId）时只能落空：不能退化成建一个本机对话。
      if (group.kind === "host") {
        if (group.hostId) void handleNewConversation(group.hostId);
        return;
      }
      void handleNewLocalConversation();
    },
    [handleNewConversation, handleNewLocalConversation],
  );

  const handleSelectSidebarItem = useCallback(
    (item: SidebarItem) => {
      if (item.tabId) {
        activateTab(item.tabId);
        return;
      }
      const topic = topics.find((t) => t.id === item.topicId);
      if (topic) openConversationTab(topic);
    },
    [activateTab, topics, openConversationTab],
  );

  const handleDeleteSidebarItem = useCallback(
    (item: SidebarItem) => {
      if (item.kind === "host-chat") {
        const topic = topics.find((t) => t.id === item.topicId);
        if (topic) void handleDeleteConversation(topic);
        return;
      }
      if (item.tabId) void requestCloseTab(item.tabId);
    },
    [topics, handleDeleteConversation, requestCloseTab],
  );

  const requestPasteConfirm = useCallback(async () => {
    return confirm({ title: "粘贴多行内容", okText: "粘贴", content: "粘贴内容包含多行，确定继续？" });
  }, [confirm]);

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

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      localStorage.setItem("df_terminal_sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  }, []);

  /** 浮层锚定到触发按钮右侧；右边界不够时左移，不越出窗口。 */
  const openPicker = useCallback(
    (mode: "terminal" | "conversation", anchor: HTMLElement) => {
      const PICKER_WIDTH = 320;
      const GAP = 6;
      const MARGIN = 8;
      const rect = anchor.getBoundingClientRect();
      let left = rect.right + GAP;
      if (left + PICKER_WIDTH > window.innerWidth - MARGIN) {
        left = window.innerWidth - PICKER_WIDTH - MARGIN;
      }
      if (left < MARGIN) left = MARGIN;
      const top = Math.max(MARGIN, rect.top - MARGIN);
      setPicker({
        mode,
        style: {
          position: "fixed",
          left,
          top,
          maxHeight: Math.min(420, window.innerHeight - top - MARGIN),
        },
      });
    },
    [],
  );

  const groups = useMemo(
    () => buildSidebarGroups(tabs, topics, settings.sshHosts, activityAt),
    [tabs, topics, settings.sshHosts, activityAt],
  );

  const hasSessionTab = tabs.some((t) => t.kind === "terminal" || t.kind === "ssh");
  // 抽屉按钮压在内容区右下角：只有当前标签是终端/SSH 时才显示，
  // 否则会盖住对话页的发送按钮。
  const activeIsSession = tabs.some(
    (t) => t.id === activeTabId && (t.kind === "terminal" || t.kind === "ssh"),
  );
  const settingsActive = tabs.some(
    (t) => t.kind === "settings" && t.id === activeTabId,
  );

  return (
    <div className="terminal-page">
      <TerminalSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        groups={groups}
        activeTabId={activeTabId}
        settingsActive={settingsActive}
        topicStatus={topicStatus}
        onSelectItem={handleSelectSidebarItem}
        onDeleteItem={handleDeleteSidebarItem}
        onCreateTerminal={(anchor) => openPicker("terminal", anchor)}
        onCreateConversation={(anchor) => openPicker("conversation", anchor)}
        onNewTerminalForGroup={handleNewTerminalForGroup}
        onNewConversationForGroup={handleNewConversationForGroup}
        onEditHost={handleEditHostFromSidebar}
        onOpenSettings={() => handleOpenSettings()}
        onOpenAgentSettings={() => setAgentSettingsOpen(true)}
      />

      <div className="terminal-page-main">
        <div className="terminal-instances-wrapper">
          {tabs.length === 0 && (
            <TerminalEmptyState
              recent={settings.sshRecent}
              onOpenLocal={handleAddTab}
              onOpenRecent={handleOpenRecent}
            />
          )}
          {tabs.map((tab) => {
            if (tab.kind === "host-chat") {
              const topic = topics.find((t) => t.id === tab.topicId);
              if (!topic) return null;
              return (
                <HostChatPanel
                  key={tab.id}
                  topicId={topic.id}
                  topic={topic}
                  host={
                    settings.sshHosts.find((h) => h.id === topic.host?.hostId) ??
                    null
                  }
                  isActive={tab.id === activeTabId && isActive}
                  onStatusChange={handleTopicStatus}
                  onTopicRenamed={handleTopicRenamed}
                  onTopicForked={(topic) => {
                    void refreshTopics().then((list) => {
                      if (list) openConversationTab(topic);
                    });
                  }}
                  onNewConversation={
                    topic.host?.hostId
                      ? () => void handleNewConversation(topic.host!.hostId)
                      : () => void handleNewLocalConversation()
                  }
                  onEditAgent={topic.agentId ? () => setEditingTopicAgentId(topic.agentId!) : undefined}
                />
              );
            }
            if (tab.kind === "settings") {
              return (
                <TerminalSettingsTab
                  key={tab.id}
                  isActive={tab.id === activeTabId && isActive}
                  settings={settings}
                  onChange={handleSettingsChange}
                  onConnectSsh={handleConnectSsh}
                  onQuickConnect={handleQuickConnect}
                  sectionRequest={settingsSectionRequest}
                  hostEditRequest={hostEditRequest}
                />
              );
            }
            if (awaitingReconnect.has(tab.id)) {
              return <div key={tab.id} className={`terminal-instance${tab.id === activeTabId ? ' active' : ''}`}>
                <div className="terminal-agent-recovery">
                  <p>已恢复待处理补充。请重新连接终端后手动继续，原终端运行状态不会恢复。</p>
                  <Button onClick={() => setAwaitingReconnect((prev) => {
                    const next = new Set(prev);
                    next.delete(tab.id);
                    return next;
                  })}>重新连接终端</Button>
                </div>
              </div>;
            }
            return (
              <TerminalInstance
                key={tab.id}
                tabId={tab.id}
                isActive={tab.id === activeTabId && isActive}
                cwd={tab.cwd}
                launchCommand={tab.launchCommand}
                savedHostId={tab.sshHostId}
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
                requestPasteConfirm={requestPasteConfirm}
              />
            );
          })}
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
      </div>

      {picker && (
        <TerminalHostPicker
          mode={picker.mode}
          style={picker.style}
          sshHosts={settings.sshHosts}
          onPickLocal={handleAddTab}
          onPickHost={handleConnectSsh}
          onQuickConnect={handleQuickConnect}
          onNewConversation={(hostId) => void handleNewConversation(hostId)}
          onNewLocalConversation={() => void handleNewLocalConversation()}
          onClose={() => setPicker(null)}
        />
      )}

      {hasSessionTab && (
        <TerminalAgentDrawer
          // 抽屉的一切状态都以 activeTabId 为键、发送时还要取该标签的 PTY 会话；
          // 对话标签没有会话，展开只会挤压面板并产出无会话的请求。
          isOpen={drawerOpen && activeIsSession}
          isActive={isActive}
          onToggle={() => setDrawerOpen((v) => !v)}
          activeTabId={activeTabId}
          getActiveSessionId={getActiveSessionId}
          terminalTabs={tabs}
          tabIds={tabs.map((t) => t.id)}
          onOpenSettings={handleOpenTerminalAgentSettings}
        />
      )}

      {activeIsSession && !drawerOpen && (
        <Button variant="outline" className="terminal-agent-toggle" onClick={() => setDrawerOpen(true)} title="AI 助手">
          <Smile size={18} />
        </Button>
      )}
      <AgentSettingsModal
        open={agentSettingsOpen && !!terminalAgentId}
        agentId={terminalAgentId}
        onClose={() => setAgentSettingsOpen(false)}
      />
      <AgentSettingsModal
        open={!!editingTopicAgentId}
        agentId={editingTopicAgentId}
        onClose={() => setEditingTopicAgentId(null)}
      />
      {confirmDialog}
    </div>
  );
}
