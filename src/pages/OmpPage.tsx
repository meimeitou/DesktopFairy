import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createStreamChunkBuffer } from "../hooks/createStreamChunkBuffer";
import ChatMarkdown from "../components/chat/ChatMarkdown";
import hljs from "highlight.js";
import OmpSettingsPage from "./OmpSettingsPage";
import OmpConvNav from "./OmpConvNav";
import OmpFileBrowser from "./OmpFileBrowser";
import "./OmpPage.css";

const api = window.electronAPI;

// Known model context windows (tokens)
function getContextWindow(modelId: string | null): number {
  if (!modelId) return 128_000;
  const id = modelId.toLowerCase();
  if (id.includes("claude")) return 200_000;
  if (id.includes("gpt-4o") || id.includes("gpt-4-turbo")) return 128_000;
  if (id.includes("gpt-4")) return 128_000;
  if (id.includes("gemini-1.5") || id.includes("gemini-2")) return 1_000_000;
  return 128_000;
}

function fmtTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface OmpSession {
  id: string;
  filePath: string;
  timestamp: string | null;
  cwd: string | null;
  name: string | null;
  firstMessage: string | null;
}

type ToolStatus = "pending" | "streaming" | "complete" | "error";

// A single ordered content item: either a text segment or a tool card reference
type ContentItem =
  | { kind: "text"; text: string }
  | { kind: "tool"; toolCallId: string };

interface ToolCard {
  toolCallId: string;
  toolName: string;
  args?: Record<string, unknown> | null;
  output: string;
  status: ToolStatus;
  isError?: boolean;
  intent?: string | null;
  diff?: string | null;
  filePath?: string | null;
}

interface OmpMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  thinking?: string;
  toolCards: ToolCard[];
  items: ContentItem[];
  pending?: boolean;
  isSystem?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

function sessionLabel(s: OmpSession): string {
  return s.name || s.firstMessage?.slice(0, 50) || "新对话";
}

function genId() {
  return Math.random().toString(36).slice(2);
}

function argsPreview(
  toolName: string,
  args?: Record<string, unknown> | null,
): string {
  if (!args) return "";
  // xdev browser: show path in header, action goes inside body
  if (
    toolName.toLowerCase() === "write" &&
    typeof args.path === "string" &&
    args.path.startsWith("xd://browser")
  ) {
    return args.path;
  }
  // edit: extract filename from hashline input "[filename#tag]..."
  if (toolName.toLowerCase() === "edit" && typeof args.input === "string") {
    const m = args.input.match(/^\[([^\]#]+)/);
    if (m) return m[1];
  }
  if (typeof args.path === "string") return args.path;
  if (typeof args.command === "string") return args.command.slice(0, 80);
  if (typeof args.query === "string") return args.query.slice(0, 60);
  if (typeof args.url === "string") return args.url;
  if (toolName.toLowerCase() === "browser" && typeof args.action === "string")
    return args.action;
  const first = Object.values(args).find(
    (v) => typeof v === "string" && v.length > 0,
  );
  return first ? String(first).slice(0, 60) : "";
}

function _getTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content
      .filter((b: { type?: string }) => b.type === "text")
      .map((b: { text?: string }) => b.text ?? "")
      .join("");
  return "";
}

function normalizeUsage(raw: unknown): {
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  contextWindow: number | null;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const usage = raw as Record<string, unknown>;
  const contextSnapshot =
    usage.contextSnapshot && typeof usage.contextSnapshot === "object"
      ? (usage.contextSnapshot as Record<string, unknown>)
      : null;
  const input =
    usage.inputTokens ??
    usage.input_tokens ??
    usage.input ??
    contextSnapshot?.promptTokens ??
    null;
  const output =
    usage.outputTokens ?? usage.output_tokens ?? usage.output ?? null;
  const cacheRead =
    usage.cacheReadTokens ??
    usage.cache_read_input_tokens ??
    usage.cacheRead ??
    usage.cache_read ??
    null;
  const contextWindow =
    usage.contextWindow ?? usage.context_window ?? null;
  return {
    inputTokens: Number.isFinite(Number(input)) ? Number(input) : null,
    outputTokens: Number.isFinite(Number(output)) ? Number(output) : null,
    cacheReadTokens: Number.isFinite(Number(cacheRead))
      ? Number(cacheRead)
      : null,
    contextWindow:
      contextWindow != null && Number.isFinite(Number(contextWindow))
        ? Number(contextWindow)
        : null,
  };
}

function findLatestAssistantUsage(messages: unknown): {
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  contextWindow: number | null;
} | null {
  if (!Array.isArray(messages)) return null;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const entry = messages[index] as Record<string, unknown> | null;
    const message =
      entry?.message && typeof entry.message === "object"
        ? (entry.message as Record<string, unknown>)
        : entry;
    if (message?.role !== "assistant") continue;
    const usage = normalizeUsage(message.usage);
    if (usage) return usage;
    const snapshotUsage = normalizeUsage({
      contextSnapshot: message.contextSnapshot,
    });
    if (snapshotUsage?.inputTokens) return snapshotUsage;
  }
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HighlightedCode({ code, lang }: { code: string; lang: string }) {
  const html = useMemo(() => {
    try {
      return hljs.highlight(code, { language: lang }).value;
    } catch {
      // fall back to plain escaped text on unknown language
      return code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
  }, [code, lang]);
  return (
    <pre className="omp-tool-args hljs">
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}

function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  return (
    <div className="omp-diff">
      {oldText.split("\n").map((line, i) => (
        <div key={`r${i}`} className="omp-diff-removed">
          - {line}
        </div>
      ))}
      {newText.split("\n").map((line, i) => (
        <div key={`a${i}`} className="omp-diff-added">
          + {line}
        </div>
      ))}
    </div>
  );
}

// Renders omp's " NNN|" / "-NNN|" / "+NNN|" diff format
function OmpDiffView({ diff }: { diff: string }) {
  return (
    <div className="omp-diff-unified">
      {diff.split("\n").map((line, i) => {
        const sign = line[0];
        return (
          <div
            key={i}
            className={
              sign === "+"
                ? "omp-diff-added"
                : sign === "-"
                  ? "omp-diff-removed"
                  : "omp-diff-ctx"
            }
          >
            {line}
          </div>
        );
      })}
    </div>
  );
}

/** Render tool arguments in a tool-specific way instead of raw JSON. */
function ToolArgsView({
  toolName,
  args,
}: {
  toolName: string;
  args: Record<string, unknown>;
}): React.ReactNode {
  const name = toolName.toLowerCase();

  // edit: hashline patch format
  if (name === "edit" && typeof args.patch === "string") {
    return (
      <>
        {typeof args.path === "string" && (
          <div className="omp-tool-file-path">{args.path}</div>
        )}
        <HighlightedCode code={args.patch} lang="diff" />
      </>
    );
  }

  // edit: classic old_text / new_text diff (ast_edit or legacy)
  if (
    (name === "edit" || name === "ast_edit") &&
    (args.old_text || args.oldText) &&
    (args.new_text || args.newText)
  ) {
    return (
      <>
        {typeof args.path === "string" && (
          <div className="omp-tool-file-path">{args.path}</div>
        )}
        <DiffView
          oldText={String(args.old_text ?? args.oldText ?? "")}
          newText={String(args.new_text ?? args.newText ?? "")}
        />
      </>
    );
  }

  // bash / shell — show command as code
  if (
    (name === "bash" || name === "shell") &&
    typeof args.command === "string"
  ) {
    return <HighlightedCode code={args.command} lang="bash" />;
  }

  // write xd://browser — xdev browser invocation; parse content as JSON
  if (
    name === "write" &&
    typeof args.path === "string" &&
    args.path.startsWith("xd://browser")
  ) {
    let xdevArgs: Record<string, unknown> = {};
    try {
      xdevArgs =
        typeof args.content === "string" ? JSON.parse(args.content) : {};
    } catch {
      /* JSON.parse failure: keep empty xdevArgs */
    }
    const tabName = typeof xdevArgs.name === "string" ? xdevArgs.name : null;
    const url = typeof xdevArgs.url === "string" ? xdevArgs.url : null;
    const mode = typeof xdevArgs.browser === "string" ? xdevArgs.browser : null;
    const action = typeof xdevArgs.action === "string" ? xdevArgs.action : null;
    const code = typeof xdevArgs.code === "string" ? xdevArgs.code : null;
    const metaParts = [
      tabName ? `tab "${tabName}"` : null,
      url,
      mode,
      action,
    ].filter(Boolean);
    return (
      <>
        <div className="omp-browser-meta">
          <span className="omp-browser-dot" />
          <span className="omp-browser-xdev">{args.path as string}</span>
          {metaParts.length > 0 && (
            <span className="omp-browser-meta-detail">
              {metaParts.join(" · ")}
            </span>
          )}
        </div>
        {code && <HighlightedCode code={code} lang="javascript" />}
      </>
    );
  }

  // write — show path + full content (CSS max-height handles overflow)
  if (name === "write" && typeof args.path === "string") {
    const content = typeof args.content === "string" ? args.content : null;
    const ext = args.path.split(".").pop()?.toLowerCase() ?? "";
    const langMap: Record<string, string> = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      py: "python",
      rs: "rust",
      go: "go",
      css: "css",
      json: "json",
      md: "markdown",
      sh: "bash",
      yaml: "yaml",
      yml: "yaml",
      toml: "toml",
      html: "html",
      xml: "xml",
      sql: "sql",
      c: "c",
      cpp: "cpp",
    };
    const lang = langMap[ext] ?? "";
    return (
      <>
        <div className="omp-tool-file-path">{args.path}</div>
        {content &&
          (lang ? (
            <HighlightedCode code={content} lang={lang} />
          ) : (
            <pre className="omp-tool-args">{content}</pre>
          ))}
      </>
    );
  }

  // read — show path; file content comes from tool output section
  if (name === "read") {
    return typeof args.path === "string" ? (
      <div className="omp-tool-file-path">{args.path}</div>
    ) : null;
  }

  // browser — tab meta header + code block
  if (name === "browser") {
    const tabName = typeof args.name === "string" ? args.name : null;
    const url = typeof args.url === "string" ? args.url : null;
    const mode = typeof args.browser === "string" ? args.browser : null;
    const action = typeof args.action === "string" ? args.action : null;
    const code = typeof args.code === "string" ? args.code : null;
    const metaParts = [tabName ? `tab "${tabName}"` : null, url, mode].filter(
      Boolean,
    );
    return (
      <>
        {metaParts.length > 0 ? (
          <div className="omp-browser-meta">
            <span className="omp-browser-dot" />
            {metaParts.join(" · ")}
          </div>
        ) : action ? (
          <div className="omp-tool-file-path">{action}</div>
        ) : null}
        {code && <pre className="omp-tool-args">{code}</pre>}
      </>
    );
  }

  // glob — path already shown in preview
  if (name === "glob") return null;

  // default: JSON with large strings truncated
  if (Object.keys(args).length === 0) return null;
  const sanitized = Object.fromEntries(
    Object.entries(args).map(([k, v]) =>
      typeof v === "string" && v.length > 300
        ? [k, v.slice(0, 300) + "…"]
        : [k, v],
    ),
  );
  return (
    <pre className="omp-tool-args">{JSON.stringify(sanitized, null, 2)}</pre>
  );
}

function HubStatusView({ card }: { card: ToolCard }) {
  const isDone = card.status === "complete" || card.status === "error";
  const text =
    isDone && card.output ? card.output : (card.intent ?? card.toolName);
  return (
    <div className={`omp-hub-status omp-hub-${card.status}`}>
      <span className="omp-hub-dot" />
      <span className="omp-hub-text">{text}</span>
    </div>
  );
}

function ToolCardView({
  card,
  expanded,
  onToggle,
}: {
  card: ToolCard;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (card.toolName === "hub") return <HubStatusView card={card} />;

  const preview = argsPreview(card.toolName, card.args);

  const copyContent = card.output || preview;

  return (
    <div className={`omp-tool-card omp-tool-${card.status}`}>
      <button type="button" className="omp-tool-header" onClick={onToggle}>
        <span className={`omp-tool-chevron${expanded ? " expanded" : ""}`}>
          ▸
        </span>
        <span className="omp-tool-name">{card.toolName}</span>
        {preview && <span className="omp-tool-preview">{preview}</span>}
        <button
          type="button"
          className="omp-tool-copy-btn"
          title="复制"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(copyContent).catch(() => {});
          }}
        >
          ⎘
        </button>
        <span className={`omp-tool-status omp-tool-s-${card.status}`}>
          {card.status}
        </span>
      </button>
      {expanded && (
        <div className="omp-tool-body">
          {card.filePath && (
            <div className="omp-tool-file-path">{card.filePath}</div>
          )}
          {card.args && Object.keys(card.args).length > 0 && (
            <ToolArgsView toolName={card.toolName} args={card.args} />
          )}
          {(card.diff || card.output) && (
            <>
              <div className="omp-tool-output-divider">Output</div>
              {card.diff ? (
                <OmpDiffView diff={card.diff} />
              ) : (
                <pre className="omp-tool-output">{card.output}</pre>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CollapseIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      {open ? (
        <polyline points="15 18 9 12 15 6" />
      ) : (
        <polyline points="9 18 15 12 9 6" />
      )}
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function RefreshIcon() {
  return (
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
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function FolderOpenIcon() {
  return (
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
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface OmpPageProps {
  isActive: boolean;
}

export default function OmpPage({ isActive }: OmpPageProps) {
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<OmpSession[]>([]);
  const [collapsedCwds, setCollapsedCwds] = useState<Set<string>>(new Set());
  const [activeSessionPath, setActiveSessionPath] = useState<string | null>(
    null,
  );
  const [messages, setMessages] = useState<OmpMessage[]>([]);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [pendingNewCwd, setPendingNewCwd] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [ompReady, setOmpReady] = useState(false);
  const [ompModel, setOmpModel] = useState<string | null>(null);
  const [ompVersion, setOmpVersion] = useState<string | null>(null);
  const [settingsPage, setSettingsPage] = useState(false);
  const [thinkingLevel, setThinkingLevel] = useState<string>("off");
  const [autoCompact, setAutoCompact] = useState(true);
  const [showThinking, setShowThinking] = useState(true);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [modelPickerItems, setModelPickerItems] = useState<
    Array<{ label: string; provider: string; modelId: string; inOmp: boolean }>
  >([]);
  const [showScrollBadge, setShowScrollBadge] = useState(false);
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Token usage from omp message_end
  const [contextUsage, setContextUsage] = useState<{
    inputTokens: number | null;
    outputTokens: number | null;
    cacheReadTokens: number | null;
    contextWindow: number | null;
  } | null>(null);
  const [contextVizOpen, setContextVizOpen] = useState(false);
  const [isCompacting, setIsCompacting] = useState(false);
  const [openAppMenuOpen, setOpenAppMenuOpen] = useState(false);
  // Image attachments
  const [attachedImages, setAttachedImages] = useState<
    Array<{ dataUrl: string; name: string; mediaType: string; data: string }>
  >([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  // @-file mention state
  const [atMentionOpen, setAtMentionOpen] = useState(false);
  const [atMentionFiles, setAtMentionFiles] = useState<
    Array<{ name: string; isDir: boolean }>
  >([]);
  const [atMentionIdx, setAtMentionIdx] = useState(0);
  const [atMentionCwd, setAtMentionCwd] = useState("");
  // Slash command menu state
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuItems, setSlashMenuItems] = useState<
    Array<{ name: string; description: string }>
  >([]);
  const [slashMenuIdx, setSlashMenuIdx] = useState(0);
  const slashCommandsCache = useRef<Array<{
    name: string;
    description: string;
  }> | null>(null);
  const workspaceDir = useMemo(() => {
    if (atMentionCwd) return atMentionCwd;
    if (pendingNewCwd) return pendingNewCwd;
    if (!activeSessionPath) return "";
    return (
      sessions.find((session) => session.filePath === activeSessionPath)?.cwd ??
      ""
    );
  }, [activeSessionPath, atMentionCwd, pendingNewCwd, sessions]);
  // Pending model switch: applied after omp:ready fires (needed when provider must be written first)
  const pendingModelSwitch = useRef<{
    provider: string;
    modelId: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Ref to the current model's contextWindow (updated from get_state; used as fallback for onOmpUsage)
  const modelContextWindowRef = useRef<number | null>(null);

  // Track pending assistant message across chunk events
  const pendingMsgId = useRef<string | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const list = (await api.invoke("omp:sessions:list")) as OmpSession[];
      setSessions(list ?? []);
    } catch {
      // omp may not be ready yet
    }
  }, []);

  // Lazy-load slash commands from built-ins + skills; cached after first fetch
  const getSlashCommands = useCallback(async () => {
    if (slashCommandsCache.current) return slashCommandsCache.current;
    const builtins = [
      { name: "compact", description: "压缩上下文" },
      { name: "clear", description: "清空对话" },
      { name: "new", description: "新建对话" },
      { name: "help", description: "显示帮助" },
    ];
    try {
      const resp = (await api.invoke("omp:list_skills")) as
        | Array<{ name: string; description?: string }>
        | { skills?: Array<{ name: string; description?: string }> }
        | null;
      const raw = Array.isArray(resp)
        ? resp
        : ((resp as { skills?: Array<{ name: string; description?: string }> })
            ?.skills ?? []);
      const skills = raw.map((s) => ({
        name: s.name,
        description: s.description ?? "",
      }));
      slashCommandsCache.current = [...builtins, ...skills];
    } catch {
      slashCommandsCache.current = builtins;
    }
    return slashCommandsCache.current;
  }, []);

  // omp:start is idempotent (force:false) — safe to call on every activation, handles crash recovery. force:true restarts to reload config.
  useEffect(() => {
    if (!isActive) return;
    api.invoke("omp:start", {}).catch(() => {});
  }, [isActive]);

  // Subscribe to push events
  useEffect(() => {
    // Fetch omp version once on mount
    api
      .invoke("omp:get_version")
      .then((v) => {
        if (v)
          setOmpVersion(
            String(v)
              .replace(/^omp\s+/i, "")
              .split(" ")[0],
          );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const applyOmpChunk = (
      _requestId: string,
      delta: string,
      thinking: string,
    ) => {
      setMessages((prev) => {
        const id = pendingMsgId.current;
        if (!id) return prev;
        return prev.map((m) => {
          if (m.id !== id) return m;
          let items = m.items;
          if (delta) {
            const last = items[items.length - 1];
            if (last?.kind === "text") {
              items = [
                ...items.slice(0, -1),
                { kind: "text" as const, text: last.text + delta },
              ];
            } else {
              items = [...items, { kind: "text" as const, text: delta }];
            }
          }
          return {
            ...m,
            text: m.text + delta,
            thinking: thinking ? (m.thinking ?? "") + thinking : m.thinking,
            items,
          };
        });
      });
      if (isActiveRef.current) scrollToBottom(false);
    };

    const chunkBuffer = createStreamChunkBuffer(applyOmpChunk);

    const offs = [
      api.onOmpReady(() => {
        setOmpReady(true);
        refreshSessions();
        // Apply pending model switch (written after provider sync)
        if (pendingModelSwitch.current) {
          const { provider, modelId } = pendingModelSwitch.current;
          pendingModelSwitch.current = null;
          api.invoke("omp:set_model", { provider, modelId }).catch(() => {});
        }
        // Sync model name + settings from omp state after ready
        api
          .invoke("omp:get_state")
          .then((state: unknown) => {
            const s = state as {
              model?: {
                provider?: string;
                id?: string;
                contextWindow?: number;
              };
              thinkingLevel?: string;
              autoCompactionEnabled?: boolean;
              contextUsage?: {
                tokens: number;
                contextWindow: number;
                percent: number;
              } | null;
              cwd?: string;
            } | null;
            if (s?.model?.id) {
              const short = s.model.id.replace(/-\d{8}$/, "");
              setOmpModel(short);
            }
            if (s?.model?.contextWindow != null) {
              modelContextWindowRef.current = s.model.contextWindow;
            }
            if (s?.thinkingLevel) setThinkingLevel(s.thinkingLevel);
            if (s?.autoCompactionEnabled != null)
              setAutoCompact(s.autoCompactionEnabled);
            // Sync context usage from omp's own computation.
            // get_state's tokens is a total (no input/cacheRead breakdown),
            // so we put it in inputTokens for the initial percentage display.
            // onOmpUsage / findLatestAssistantUsage will override with proper
            // segment data when message history is available.
            if (s?.contextUsage) {
              setContextUsage({
                inputTokens: s.contextUsage.tokens ?? null,
                outputTokens: null,
                cacheReadTokens: null,
                contextWindow: s.contextUsage.contextWindow ?? null,
              });
            }
            // Sync cwd for @-mention
            if (s?.cwd) setAtMentionCwd(s.cwd);
          })
          .catch(() => {});
      }),

      api.onOmpChunk(({ delta, thinking }) => {
        const id = pendingMsgId.current;
        if (!id) return;
        chunkBuffer.push(id, delta, thinking);
      }),

      api.onOmpTool((payload) => {
        if (payload.phase === "start") {
          const newCard: ToolCard = {
            toolCallId: payload.toolCallId ?? genId(),
            toolName: payload.toolName ?? "tool",
            args: payload.args,
            output: "",
            status: "pending",
            intent: payload.intent ?? null,
          };
          setMessages((prev) => {
            const id = pendingMsgId.current;
            if (!id) return prev;
            return prev.map((m) =>
              m.id === id
                ? {
                    ...m,
                    toolCards: [...m.toolCards, newCard],
                    items: [
                      ...m.items,
                      { kind: "tool" as const, toolCallId: newCard.toolCallId },
                    ],
                  }
                : m,
            );
          });
        } else if (payload.phase === "update" && payload.output) {
          setMessages((prev) =>
            prev.map((m) => ({
              ...m,
              toolCards: m.toolCards.map((tc) =>
                tc.toolCallId === payload.toolCallId
                  ? {
                      ...tc,
                      status: "streaming" as ToolStatus,
                      output: payload.output!,
                    }
                  : tc,
              ),
            })),
          );
        } else if (payload.phase === "end") {
          setMessages((prev) =>
            prev.map((m) => ({
              ...m,
              toolCards: m.toolCards.map((tc) =>
                tc.toolCallId === payload.toolCallId
                  ? {
                      ...tc,
                      status: (payload.isError
                        ? "error"
                        : "complete") as ToolStatus,
                      output: payload.output ?? tc.output,
                      diff:
                        ((payload as Record<string, unknown>).diff as string) ??
                        tc.diff,
                      filePath:
                        ((payload as Record<string, unknown>)
                          .filePath as string) ?? tc.filePath,
                    }
                  : tc,
              ),
            })),
          );
        }
      }),

      api.onOmpDone(({ messages: doneMessages }) => {
        if (pendingMsgId.current) chunkBuffer.flushRequest(pendingMsgId.current);
        setIsStreaming(false);
        pendingMsgId.current = null;
        setMessages((prev) =>
          prev.map((m) => (m.pending ? { ...m, pending: false } : m)),
        );
        const usageFromMsgs = findLatestAssistantUsage(doneMessages);
        setContextUsage(
          usageFromMsgs
            ? {
                ...usageFromMsgs,
                contextWindow:
                  usageFromMsgs.contextWindow ?? modelContextWindowRef.current,
              }
            : null,
        );
        setPendingNewCwd(null); // session is now persisted to disk after first turn
        refreshSessions();
        scrollToBottom();
      }),

      api.onOmpError(({ message }) => {
        if (pendingMsgId.current) chunkBuffer.flushRequest(pendingMsgId.current);
        setIsStreaming(false);
        pendingMsgId.current = null;
        setOmpReady(false);
        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: "assistant",
            text: `⚠ ${message}`,
            toolCards: [],
            items: [{ kind: "text" as const, text: `⚠ ${message}` }],
          },
        ]);
      }),

      api.onOmpSessionName(({ name }) => {
        if (!activeSessionPath) return;
        setSessions((prev) =>
          prev.map((s) =>
            s.filePath === activeSessionPath ? { ...s, name } : s,
          ),
        );
      }),

      api.onOmpModelChanged?.(({ model }) => {
        if (model?.id) setOmpModel(model.id.replace(/-\d{8}$/, ""));
      }),

      api.onOmpCommandOutput?.(({ text }) => {
        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: "assistant",
            text,
            toolCards: [],
            isSystem: true,
          },
        ]);
        scrollToBottom();
      }),

      api.onOmpNotice?.(({ kind, summary }) => {
        if (kind === "compaction_start") {
          setIsCompacting(true);
          setMessages((prev) => [
            ...prev,
            {
              id: genId(),
              role: "assistant",
              text: "_压缩上下文中…_",
              toolCards: [],
              items: [{ kind: "text" as const, text: "_压缩上下文中…_" }],
            },
          ]);
        } else if (kind === "compaction_end") {
          setIsCompacting(false);
          setContextUsage(null);
          if (summary) {
            setMessages((prev) => [
              ...prev,
              {
                id: genId(),
                role: "assistant",
                text: `_✓ 上下文已压缩：${summary}_`,
                toolCards: [],
                items: [
                  {
                    kind: "text" as const,
                    text: `_✓ 上下文已压缩：${summary}_`,
                  },
                ],
              },
            ]);
          }
        }
      }),

      api.onOmpUsage?.(
        ({ inputTokens, outputTokens, cacheReadTokens, contextWindow }) => {
          setContextUsage({
            inputTokens,
            outputTokens,
            cacheReadTokens: cacheReadTokens ?? null,
            contextWindow:
              contextWindow ?? modelContextWindowRef.current ?? null,
          });
        },
      ),
    ];

    return () => {
      chunkBuffer.dispose();
      offs.forEach((off) => off?.());
    };
  }, [refreshSessions, scrollToBottom, activeSessionPath]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isStreaming || !ompReady) return;

    const isSlashCommand = text.startsWith("/");
    const msgId = genId();
    // Slash commands don't stream assistant text; only regular prompts create a pending bubble
    pendingMsgId.current = isSlashCommand ? null : msgId;

    setMessages((prev) => [
      ...prev,
      {
        id: genId(),
        role: "user",
        text,
        toolCards: [],
        items: [{ kind: "text" as const, text }],
      },
      ...(!isSlashCommand
        ? [
            {
              id: msgId,
              role: "assistant" as const,
              text: "",
              toolCards: [],
              items: [] as ContentItem[],
              pending: true,
            },
          ]
        : []),
    ]);
    setInputText("");
    const imgs = attachedImages.slice();
    setAttachedImages([]);
    setIsStreaming(true);
    api
      .invoke("omp:prompt", {
        message: text,
        images: imgs.length ? imgs : undefined,
      })
      .catch(() => {});
    scrollToBottom();
  }, [inputText, isStreaming, ompReady, scrollToBottom, attachedImages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleNewSession = useCallback(async () => {
    const result = (await api
      .invoke("omp:pick_directory")
      .catch(() => ({ ok: false }))) as { ok: boolean; path?: string };
    if (!result.ok || !result.path) return;
    const chosenCwd = result.path;
    setPendingNewCwd(chosenCwd);
    setAtMentionCwd(chosenCwd);
    setMessages([]);
    setActiveSessionPath(null);
    setExpandedTools(new Set());
    setContextUsage(null);
    pendingMsgId.current = null;
    setIsStreaming(false);
    setOmpReady(false);
    await api.invoke("omp:new_session", { cwd: chosenCwd }).catch(() => {});
  }, []);

  const handleNewSessionHome = useCallback(async () => {
    const home = (await api.invoke("omp:get_home_dir").catch(() => null)) as
      | string
      | null;
    const cwd = home ?? ".";
    setPendingNewCwd(cwd);
    setAtMentionCwd(cwd);
    setMessages([]);
    setActiveSessionPath(null);
    setExpandedTools(new Set());
    setContextUsage(null);
    pendingMsgId.current = null;
    setIsStreaming(false);
    setOmpReady(false);
    await api.invoke("omp:new_session", { cwd }).catch(() => {});
  }, []);

  const handleNewSessionInCwd = useCallback(
    async (e: React.MouseEvent, cwd: string) => {
      e.stopPropagation();
      setPendingNewCwd(cwd);
      setAtMentionCwd(cwd);
      setMessages([]);
      setActiveSessionPath(null);
      setExpandedTools(new Set());
      setContextUsage(null);
      pendingMsgId.current = null;
      setIsStreaming(false);
      setOmpReady(false);
      await api.invoke("omp:new_session", { cwd }).catch(() => {});
    },
    [],
  );

  const handleDeleteSession = useCallback(
    async (e: React.MouseEvent, filePath: string) => {
      e.stopPropagation();
      await api.invoke("omp:sessions:delete", { filePath }).catch(() => {});
      if (filePath === activeSessionPath) {
        setActiveSessionPath(null);
        setMessages([]);
      }
      await refreshSessions();
    },
    [activeSessionPath, refreshSessions],
  );

  const handleSwitchSession = useCallback(
    async (session: OmpSession) => {
      if (session.filePath === activeSessionPath) return;
      setActiveSessionPath(session.filePath);
      setMessages([]);
      setExpandedTools(new Set());
      setPendingNewCwd(null);
      setAtMentionCwd(session.cwd ?? "");
      setContextUsage(null);
      pendingMsgId.current = null;
      setIsStreaming(false);
      await api
        .invoke("omp:switch_session", { sessionPath: session.filePath })
        .catch(() => {});
      // Await get_state to refresh model contextWindow + get omp's contextUsage as fallback
      let stateContextUsage: { tokens: number; contextWindow: number; percent: number } | null = null;
      try {
        const state = (await api.invoke("omp:get_state")) as {
          model?: { id?: string; contextWindow?: number };
          contextUsage?: {
            tokens: number;
            contextWindow: number;
            percent: number;
          } | null;
        } | null;
        if (state?.model?.contextWindow != null)
          modelContextWindowRef.current = state.model.contextWindow;
        else if (state?.contextUsage?.contextWindow != null)
          modelContextWindowRef.current = state.contextUsage.contextWindow;
        stateContextUsage = state?.contextUsage ?? null;
      } catch {
        // get_state failed — fall through to history-based usage below
      }
      try {
        const data = (await api.invoke("omp:sessions:read_history", {
          filePath: session.filePath,
        })) as {
          messages: Array<{ role: string; content: unknown }>;
          toolIntents: Record<string, string>;
          toolDiffs: Record<string, string>;
          toolPaths: Record<string, string>;
        };
        const rawMsgs = data?.messages ?? [];
        const toolIntents: Record<string, string> = data?.toolIntents ?? {};
        const toolDiffs: Record<string, string> = data?.toolDiffs ?? {};
        const toolPaths: Record<string, string> = data?.toolPaths ?? {};

        // Collect tool results keyed by toolCallId for history rendering
        const toolResultMap = new Map<string, string>();
        for (const m of rawMsgs) {
          // AI SDK format: role "tool", content array of tool-result blocks
          if (m.role === "tool" && Array.isArray(m.content)) {
            for (const r of m.content as Array<Record<string, unknown>>) {
              const tid = (r.toolCallId ?? r.tool_use_id) as string | undefined;
              if (!tid) continue;
              // AI SDK stores result in r.result; legacy format in r.content
              const raw = r.result ?? r.content;
              const text =
                typeof raw === "string"
                  ? raw
                  : Array.isArray(raw)
                    ? (raw as Array<{ type?: string; text?: string }>)
                        .filter((b) => b.type === "text")
                        .map((b) => b.text ?? "")
                        .join("\n")
                    : raw != null
                      ? JSON.stringify(raw).slice(0, 800)
                      : "";
              toolResultMap.set(tid, text);
            }
          }
          // Legacy omp format: role "toolResult" with toolCallId on the message
          if (m.role === "toolResult") {
            const legacy = m as Record<string, unknown>;
            const tid = legacy.toolCallId as string | undefined;
            if (tid && Array.isArray(legacy.content)) {
              const text = (
                legacy.content as Array<{ type?: string; text?: string }>
              )
                .filter((b) => b.type === "text")
                .map((b) => b.text ?? "")
                .join("\n");
              toolResultMap.set(tid, text);
            }
          }
        }

        const mapped: OmpMessage[] = rawMsgs
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => {
            const blocks = Array.isArray(m.content)
              ? (m.content as Array<Record<string, unknown>>)
              : [];
            const text =
              typeof m.content === "string"
                ? m.content
                : blocks
                    .filter((b) => b.type === "text")
                    .map((b) => (b.text as string) ?? "")
                    .join("");
            const thinking =
              blocks
                .filter((b) => b.type === "thinking")
                .map((b) => (b.thinking ?? b.text ?? "") as string)
                .join("") || undefined;
            const TOOL_BLOCK_TYPES = new Set([
              "toolCall",
              "tool-call",
              "tool_call",
              "tool_use",
            ]);
            const toolCards: ToolCard[] = [];
            const items: ContentItem[] = [];
            // Build toolCards and items in content block order
            for (const b of typeof m.content === "string" ? [] : blocks) {
              if (b.type === "text" && typeof b.text === "string" && b.text) {
                const last = items[items.length - 1];
                if (last?.kind === "text") {
                  (last as { kind: "text"; text: string }).text += b.text;
                } else {
                  items.push({ kind: "text", text: b.text });
                }
              } else if (b.type === "thinking") {
                // thinking handled separately, skip
              } else if (TOOL_BLOCK_TYPES.has(b.type as string)) {
                const tid = (b.toolCallId ?? b.id ?? genId()) as string;
                const card: ToolCard = {
                  toolCallId: tid,
                  toolName: (b.toolName ?? b.name ?? "tool") as string,
                  args: (b.arguments ?? b.args ?? b.input) as
                    | Record<string, unknown>
                    | undefined,
                  output: toolResultMap.get(tid) ?? "",
                  status: "complete" as ToolStatus,
                  intent: toolIntents[tid] ?? null,
                  diff: toolDiffs[tid] ?? null,
                  filePath: toolPaths[tid] ?? null,
                };
                toolCards.push(card);
                items.push({ kind: "tool", toolCallId: tid });
              }
            }
            // For plain string content messages (user)
            if (typeof m.content === "string" && m.content) {
              items.push({ kind: "text", text: m.content });
            }
            return {
              id: genId(),
              role: m.role as "user" | "assistant",
              text,
              thinking,
              toolCards,
              items,
            };
          })
          .filter((m) => m.text || m.toolCards.length > 0);
        setMessages(mapped);
        // Set contextUsage: prefer history segments (input/cacheRead breakdown),
        // fallback to get_state's total tokens if no assistant usage in history
        const usageFromHistory = findLatestAssistantUsage(rawMsgs);
        if (usageFromHistory) {
          setContextUsage({
            ...usageFromHistory,
            contextWindow:
              usageFromHistory.contextWindow ?? modelContextWindowRef.current,
          });
        } else if (stateContextUsage) {
          setContextUsage({
            inputTokens: stateContextUsage.tokens ?? null,
            outputTokens: null,
            cacheReadTokens: null,
            contextWindow: stateContextUsage.contextWindow ?? null,
          });
        }
      } catch {
        setContextUsage(null);
        setMessages([]);
      }
      scrollToBottom();
    },
    [activeSessionPath, scrollToBottom],
  );

  return (
    <div className="omp-page">
      {settingsPage && (
        <OmpSettingsPage
          onBack={() => setSettingsPage(false)}
          thinkingLevel={thinkingLevel}
          autoCompact={autoCompact}
          showThinking={showThinking}
          ompModel={ompModel}
          ompVersion={ompVersion}
          onThinkingLevelChange={setThinkingLevel}
          onAutoCompactChange={setAutoCompact}
          onShowThinkingChange={setShowThinking}
        />
      )}
      {!settingsPage && (
        <>
          {/* ─── Sidebar ─── */}
          <aside
            className={`omp-sidebar${sidebarOpen ? "" : " omp-sidebar-collapsed"}`}
          >
            {/* Header: search + action icons (picot sidebar-header style) */}
            {sidebarOpen && (
              <div className="omp-sidebar-header">
                <div className="omp-sidebar-header-actions">
                  <div className="omp-sidebar-search-wrap">
                    <input
                      className="omp-sidebar-search"
                      type="text"
                      placeholder="搜索对话…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="omp-sidebar-search-clear"
                        onClick={() => setSearchQuery("")}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="omp-icon-btn"
                    title="新对话"
                    onClick={handleNewSessionHome}
                  >
                    <PlusIcon />
                  </button>
                  <button
                    type="button"
                    className="omp-icon-btn"
                    title="选择目录新对话"
                    onClick={handleNewSession}
                  >
                    <FolderOpenIcon />
                  </button>
                  <button
                    type="button"
                    className="omp-icon-btn"
                    title="刷新"
                    onClick={() => refreshSessions()}
                  >
                    <RefreshIcon />
                  </button>
                </div>
              </div>
            )}

            {sidebarOpen &&
              (() => {
                // Group sessions by cwd, sorted by most-recent session in each group
                const groupMap = new Map<string, OmpSession[]>();
                for (const s of sessions) {
                  const key = s.cwd ?? "(unknown)";
                  if (!groupMap.has(key)) groupMap.set(key, []);
                  groupMap.get(key)!.push(s);
                }
                // Inject pending cwd into groups if it isn't already present
                if (pendingNewCwd && !groupMap.has(pendingNewCwd)) {
                  groupMap.set(pendingNewCwd, []);
                }
                const groups = Array.from(groupMap.entries()).sort((a, b) => {
                  const ta = a[1][0]?.timestamp
                    ? new Date(a[1][0].timestamp).getTime()
                    : 0;
                  const tb = b[1][0]?.timestamp
                    ? new Date(b[1][0].timestamp).getTime()
                    : 0;
                  return tb - ta;
                });

                const filteredGroups = searchQuery
                  ? groups
                      .map(
                        ([cwd, ss]) =>
                          [
                            cwd,
                            ss.filter((s) =>
                              sessionLabel(s)
                                .toLowerCase()
                                .includes(searchQuery.toLowerCase()),
                            ),
                          ] as [string, OmpSession[]],
                      )
                      .filter(([, ss]) => ss.length > 0)
                  : groups;

                if (filteredGroups.length === 0) {
                  return (
                    <div className="omp-session-empty">
                      {searchQuery
                        ? "无匹配结果"
                        : ompReady
                          ? "暂无会话"
                          : "启动中…"}
                    </div>
                  );
                }

                return (
                  <ul className="omp-session-list">
                    {filteredGroups.map(([cwd, groupSessions]) => {
                      const collapsed = collapsedCwds.has(cwd);
                      const dirName =
                        cwd === "(unknown)"
                          ? cwd
                          : (cwd.split("/").filter(Boolean).pop() ?? cwd);
                      return (
                        <li key={cwd} className="omp-cwd-group">
                          <div className="omp-cwd-header">
                            <button
                              type="button"
                              className="omp-cwd-toggle"
                              title={cwd}
                              onClick={() =>
                                setCollapsedCwds((prev) => {
                                  const next = new Set(prev);
                                  if (collapsed) next.delete(cwd);
                                  else next.add(cwd);
                                  return next;
                                })
                              }
                            >
                              <FolderIcon />
                              <span className="omp-cwd-label">{dirName}</span>
                              <CollapseIcon open={!collapsed} />
                            </button>
                            <button
                              type="button"
                              className="omp-cwd-add"
                              title={`在 ${dirName} 新建对话`}
                              onClick={(e) => handleNewSessionInCwd(e, cwd)}
                            >
                              +
                            </button>
                          </div>
                          {!collapsed && (
                            <ul className="omp-cwd-sessions">
                              {cwd === pendingNewCwd && (
                                <li className="omp-session-item omp-session-active omp-session-pending">
                                  <div className="omp-session-title-row">
                                    <span className="omp-session-label">
                                      新对话
                                    </span>
                                  </div>
                                  <span className="omp-session-time">
                                    活跃中
                                  </span>
                                </li>
                              )}
                              {groupSessions.map((s) => (
                                <li
                                  key={s.filePath}
                                  className={`omp-session-item${s.filePath === activeSessionPath ? " omp-session-active" : ""}`}
                                  onClick={() => handleSwitchSession(s)}
                                  title={s.filePath}
                                >
                                  <div className="omp-session-title-row">
                                    <span className="omp-session-label">
                                      {sessionLabel(s)}
                                    </span>
                                    <button
                                      type="button"
                                      className="omp-session-delete"
                                      onClick={(e) =>
                                        handleDeleteSession(e, s.filePath)
                                      }
                                      title="删除"
                                    >
                                      ×
                                    </button>
                                  </div>
                                  <span className="omp-session-time">
                                    {formatRelativeTime(s.timestamp)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}

            {/* ─── Sidebar footer: single settings button ─── */}
            <div className="omp-sidebar-footer">
              <div className="omp-sidebar-settings-row">
                <button
                  type="button"
                  className="omp-sidebar-settings-btn"
                  onClick={() => setSettingsPage(true)}
                >
                  <span style={{ fontSize: 15, flexShrink: 0 }}>⚙️</span>
                  {sidebarOpen && <span>设置</span>}
                </button>
                {sidebarOpen && ompVersion && (
                  <span className="omp-sidebar-version">{ompVersion}</span>
                )}
              </div>
            </div>
          </aside>

          {/* ─── Main area ─── */}
          <div className="omp-main">
            {/* Header: sidebar toggle + status info + model picker */}
            <div className="omp-status-bar">
              {/* Sidebar toggle */}
              <button
                type="button"
                className="omp-sidebar-toggle"
                title={sidebarOpen ? "折叠侧边栏" : "展开侧边栏"}
                onClick={() => setSidebarOpen((v) => !v)}
              >
                <CollapseIcon open={sidebarOpen} />
              </button>
              {/* Status cluster: dot + text */}
              <div className="omp-status">
                <span
                  className={`omp-status-dot${
                    isStreaming
                      ? " omp-status-dot-streaming"
                      : ompReady
                        ? " omp-status-dot-ready"
                        : ""
                  }`}
                />
                <span className="omp-status-text">
                  {isStreaming
                    ? "流式输出中"
                    : ompReady
                      ? "已连接"
                      : "等待 omp…"}
                </span>
              </div>
              {/* Workspace pill — click toggles file browser */}
              <button
                type="button"
                className="omp-workspace-pill"
                title={workspaceDir || "当前未选择工作目录"}
                disabled={!workspaceDir}
                onClick={() => setFileBrowserOpen((v) => !v)}
              >
                📁{" "}
                {workspaceDir
                  ? (workspaceDir.split("/").filter(Boolean).pop() ??
                    workspaceDir)
                  : "未选择目录"}
              </button>
              {/* Spacer */}
              <div style={{ flex: 1 }} />
              {/* Context usage pill + popover (picot-style) */}
              {(() => {
                const inputTok = contextUsage?.inputTokens ?? 0;
                const cacheTok = contextUsage?.cacheReadTokens ?? 0;
                const total = inputTok + cacheTok;
                const ctxWindow =
                  contextUsage?.contextWindow ??
                  modelContextWindowRef.current ??
                  getContextWindow(ompModel);
                const pct =
                  ctxWindow > 0 && total > 0
                    ? Math.min(100, Math.round((total / ctxWindow) * 100))
                    : 0;
                const canCompact = total > 20_000;
                const pillClass = [
                  "pill",
                  "omp-token-usage",
                  pct >= 80 ? "critical" : pct >= 60 ? "warning" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <span className="omp-context-usage-anchor">
                    <button
                      type="button"
                      className={pillClass}
                      title={`上下文: ${fmtTokens(total)} / ${fmtTokens(ctxWindow)} tokens`}
                      onClick={() => setContextVizOpen((v) => !v)}
                    >
                      {`${pct}%`}
                    </button>
                    {contextVizOpen && (
                      <>
                        <div
                          className="omp-model-overlay"
                          onClick={() => setContextVizOpen(false)}
                        />
                        <div className="omp-context-viz">
                          <div className="omp-context-viz-title">
                            上下文窗口
                          </div>
                          {/* Stacked bar: cache | input | free */}
                          <div className="omp-context-bar">
                            {cacheTok > 0 && (
                              <div
                                className="omp-context-bar-seg cache"
                                style={{
                                  width: `${(cacheTok / ctxWindow) * 100}%`,
                                }}
                                title={`缓存: ${fmtTokens(cacheTok)}`}
                              />
                            )}
                            {inputTok > 0 && (
                              <div
                                className="omp-context-bar-seg input"
                                style={{
                                  width: `${(inputTok / ctxWindow) * 100}%`,
                                }}
                                title={`输入: ${fmtTokens(inputTok)}`}
                              />
                            )}
                            {total <= 0 && (
                              <div
                                className="omp-context-bar-seg free"
                                style={{ width: "100%" }}
                                title="尚无上下文使用"
                              />
                            )}
                          </div>
                          {/* Legend */}
                          <div className="omp-context-legend">
                            {cacheTok > 0 && (
                              <div className="omp-context-legend-item">
                                <span className="omp-context-legend-left">
                                  <span className="omp-context-legend-dot cache" />
                                  缓存命中
                                </span>
                                <span className="omp-context-legend-val">
                                  {fmtTokens(cacheTok)}
                                </span>
                              </div>
                            )}
                            <div className="omp-context-legend-item">
                              <span className="omp-context-legend-left">
                                <span className="omp-context-legend-dot input" />
                                输入
                              </span>
                              <span className="omp-context-legend-val">
                                {fmtTokens(inputTok)}
                              </span>
                            </div>
                            <div className="omp-context-legend-item">
                              <span className="omp-context-legend-left">
                                <span className="omp-context-legend-dot free" />
                                剩余
                              </span>
                              <span className="omp-context-legend-val">
                                {fmtTokens(Math.max(0, ctxWindow - total))}
                              </span>
                            </div>
                          </div>
                          {/* Footer */}
                          <div className="omp-context-viz-footer">
                            <span className="omp-context-viz-summary">
                              <span>{fmtTokens(total)}</span>
                              <span className="omp-context-viz-sep">/</span>
                              <span>{fmtTokens(ctxWindow)}</span>
                            </span>
                            <button
                              type="button"
                              className="omp-context-compact-btn"
                              title={
                                canCompact
                                  ? "压缩上下文"
                                  : "上下文不足 20k，暂不可压缩"
                              }
                              disabled={
                                !canCompact || isStreaming || isCompacting
                              }
                              onClick={() => {
                                setContextVizOpen(false);
                                api.invoke("omp:compact").catch(() => {});
                              }}
                            >
                              {isCompacting ? "压缩中…" : "压缩"}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </span>
                );
              })()}
              {/* Open in app split button */}
              <div className={`omp-open-app${openAppMenuOpen ? " open" : ""}`}>
                <button
                  type="button"
                  className="omp-open-app-btn"
                  title={
                    workspaceDir ? "在 VS Code 中打开" : "当前未选择工作目录"
                  }
                  disabled={!workspaceDir}
                  onClick={() =>
                    api
                      .invoke("omp:open_in_app", {
                        app: "vscode",
                        dirPath: workspaceDir,
                      })
                      .catch(() => {})
                  }
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 19.851V4.149a1.5 1.5 0 0 0-.85-1.562zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="omp-open-app-toggle"
                  title={workspaceDir ? "更多打开方式" : "当前未选择工作目录"}
                  disabled={!workspaceDir}
                  onClick={() => setOpenAppMenuOpen((v) => !v)}
                >
                  ▾
                </button>
                {openAppMenuOpen && workspaceDir && (
                  <>
                    <div
                      className="omp-model-overlay"
                      onClick={() => setOpenAppMenuOpen(false)}
                    />
                    <div className="omp-open-app-menu">
                      {[
                        { app: "vscode", label: "VS Code" },
                        { app: "cursor", label: "Cursor" },
                        { app: "finder", label: "Finder" },
                      ].map(({ app, label }) => (
                        <button
                          key={app}
                          type="button"
                          className="omp-open-app-menu-item"
                          onClick={() => {
                            setOpenAppMenuOpen(false);
                            api
                              .invoke("omp:open_in_app", {
                                app,
                                dirPath: workspaceDir,
                              })
                              .catch(() => {});
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="omp-messages-wrapper">
              <div className="omp-messages" ref={messagesContainerRef}>
                {messages.length === 0 && (
                  <div className="omp-messages-empty">
                    {ompReady ? "发送消息开始对话" : "正在启动 omp…"}
                  </div>
                )}
                {messages.map((msg) =>
                  msg.isSystem ? (
                    <div key={msg.id} className="omp-msg-system">
                      <ChatMarkdown content={msg.text} />
                    </div>
                  ) : (
                    <div
                      id={`omp-msg-${msg.id}`}
                      key={msg.id}
                      className={`omp-msg omp-msg-${msg.role}${msg.pending ? " omp-msg-pending" : ""}`}
                    >
                      {msg.thinking && showThinking && (
                        <div className="omp-msg-thinking">{msg.thinking}</div>
                      )}
                      {(msg.items ?? []).length > 0 ? (
                        (msg.items ?? []).map((item, i) =>
                          item.kind === "tool" ? (
                            <ToolCardView
                              key={item.toolCallId}
                              card={
                                msg.toolCards.find(
                                  (tc) => tc.toolCallId === item.toolCallId,
                                )!
                              }
                              expanded={expandedTools.has(item.toolCallId)}
                              onToggle={() =>
                                setExpandedTools((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.toolCallId))
                                    next.delete(item.toolCallId);
                                  else next.add(item.toolCallId);
                                  return next;
                                })
                              }
                            />
                          ) : msg.role === "assistant" ? (
                            <div key={i} className="omp-msg-text">
                              <ChatMarkdown
                                content={item.text}
                                streaming={
                                  msg.pending &&
                                  i === (msg.items ?? []).length - 1
                                }
                              />
                            </div>
                          ) : (
                            <div key={i} className="omp-msg-text">
                              {item.text}
                            </div>
                          ),
                        )
                      ) : (
                        /* fallback for legacy messages without items */ <>
                          {msg.toolCards.map((tc) => (
                            <ToolCardView
                              key={tc.toolCallId}
                              card={tc}
                              expanded={expandedTools.has(tc.toolCallId)}
                              onToggle={() =>
                                setExpandedTools((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(tc.toolCallId))
                                    next.delete(tc.toolCallId);
                                  else next.add(tc.toolCallId);
                                  return next;
                                })
                              }
                            />
                          ))}
                          {msg.text &&
                            (msg.role === "assistant" ? (
                              <div className="omp-msg-text">
                                <ChatMarkdown
                                  content={msg.text}
                                  streaming={msg.pending}
                                />
                              </div>
                            ) : (
                              <div className="omp-msg-text">{msg.text}</div>
                            ))}
                        </>
                      )}
                      {msg.pending &&
                        (msg.items ?? []).length === 0 &&
                        !msg.thinking && (
                          <div className="omp-msg-typing">
                            <span />
                            <span />
                            <span />
                          </div>
                        )}
                    </div>
                  ),
                )}
                <div ref={messagesEndRef} />
              </div>
              <OmpConvNav
                messages={messages.filter((m) => !m.isSystem)}
                containerRef={messagesContainerRef}
                onScrollBadgeChange={setShowScrollBadge}
              />
              {showScrollBadge && (
                <button
                  type="button"
                  className="omp-scroll-badge"
                  onClick={scrollToBottom}
                >
                  ↓ 新消息
                </button>
              )}
            </div>

            {/* Input */}
            <div className="omp-input-area">
              {/* Slash command menu */}
              {slashMenuOpen && slashMenuItems.length > 0 && (
                <div className="omp-slash-menu">
                  <div className="omp-slash-heading">命令</div>
                  {slashMenuItems.map((cmd, idx) => (
                    <button
                      key={cmd.name}
                      type="button"
                      className={`omp-slash-option${idx === slashMenuIdx ? " selected" : ""}`}
                      onMouseEnter={() => setSlashMenuIdx(idx)}
                      onClick={() => {
                        setInputText(`/${cmd.name} `);
                        setSlashMenuOpen(false);
                        requestAnimationFrame(() => inputRef.current?.focus());
                      }}
                    >
                      <span className="omp-slash-sigil">/</span>
                      <span className="omp-slash-name">{cmd.name}</span>
                      {cmd.description && (
                        <span className="omp-slash-description">
                          {cmd.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {/* @-file mention menu */}
              {atMentionOpen && atMentionFiles.length > 0 && (
                <div className="omp-at-menu">
                  {atMentionFiles.map((f, idx) => (
                    <button
                      key={f.name}
                      type="button"
                      className={`omp-at-item${idx === atMentionIdx ? " active" : ""}`}
                      onMouseEnter={() => setAtMentionIdx(idx)}
                      onClick={() => {
                        const suffix = f.isDir ? "/" : "";
                        const insert = `@"${f.name}${suffix}"`;
                        const ta = inputRef.current;
                        if (ta) {
                          const pos = ta.selectionStart ?? inputText.length;
                          // Replace from the @ character backwards
                          const before = inputText.slice(0, pos);
                          const atIdx = before.lastIndexOf("@");
                          const newText =
                            inputText.slice(0, atIdx) +
                            insert +
                            inputText.slice(pos);
                          setInputText(newText);
                          requestAnimationFrame(() => {
                            ta.selectionStart = ta.selectionEnd =
                              atIdx + insert.length;
                            ta.focus();
                          });
                        }
                        setAtMentionOpen(false);
                      }}
                    >
                      <span className="omp-at-icon">
                        {f.isDir ? "📁" : "📄"}
                      </span>
                      <span className="omp-at-name">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <div
                className={`omp-input-row${isStreaming ? " streaming" : ""}`}
              >
                <textarea
                  ref={inputRef}
                  className="omp-input"
                  value={inputText}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setInputText(val);
                    const pos = e.target.selectionStart ?? val.length;
                    const before = val.slice(0, pos);

                    // Slash command detection: /cmd at start, no space yet, not //
                    if (
                      before.startsWith("/") &&
                      !before.startsWith("//") &&
                      !before.includes(" ")
                    ) {
                      const query = before.slice(1).toLowerCase();
                      const all = await getSlashCommands();
                      const filtered = all.filter((c) =>
                        c.name.toLowerCase().startsWith(query),
                      );
                      setSlashMenuItems(filtered.slice(0, 10));
                      setSlashMenuIdx(0);
                      setSlashMenuOpen(filtered.length > 0 || query === "");
                      setAtMentionOpen(false);
                      return;
                    }
                    setSlashMenuOpen(false);

                    // @-file mention detection
                    const atIdx = before.lastIndexOf("@");
                    if (atIdx >= 0 && !before.slice(atIdx + 1).includes(" ")) {
                      const query = before.slice(atIdx + 1).toLowerCase();
                      const cwd =
                        (atMentionCwd ||
                          ((window as Record<string, unknown>)
                            ._ompCwd as string)) ??
                        "";
                      try {
                        const files = (await api.invoke("omp:list_files", {
                          dir: cwd || ".",
                        })) as Array<{ name: string; isDir: boolean }>;
                        const filtered = files.filter((f) =>
                          f.name.toLowerCase().startsWith(query),
                        );
                        setAtMentionFiles(filtered.slice(0, 12));
                        setAtMentionIdx(0);
                        setAtMentionOpen(filtered.length > 0);
                      } catch {
                        setAtMentionOpen(false);
                      }
                    } else {
                      setAtMentionOpen(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    // Slash menu navigation
                    if (slashMenuOpen) {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setSlashMenuIdx((i) =>
                          Math.min(i + 1, slashMenuItems.length - 1),
                        );
                        return;
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setSlashMenuIdx((i) => Math.max(i - 1, 0));
                        return;
                      }
                      if (e.key === "Escape") {
                        setSlashMenuOpen(false);
                        return;
                      }
                      if (e.key === "Tab" || e.key === "Enter") {
                        const cmd = slashMenuItems[slashMenuIdx];
                        if (cmd) {
                          e.preventDefault();
                          setInputText(`/${cmd.name} `);
                          setSlashMenuOpen(false);
                          requestAnimationFrame(() => {
                            const ta = inputRef.current;
                            if (ta) {
                              ta.selectionStart = ta.selectionEnd =
                                cmd.name.length + 2;
                            }
                          });
                          return;
                        }
                      }
                    }
                    if (atMentionOpen) {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setAtMentionIdx((i) =>
                          Math.min(i + 1, atMentionFiles.length - 1),
                        );
                        return;
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setAtMentionIdx((i) => Math.max(i - 1, 0));
                        return;
                      }
                      if (e.key === "Escape") {
                        setAtMentionOpen(false);
                        return;
                      }
                      if (e.key === "Tab" || e.key === "Enter") {
                        const f = atMentionFiles[atMentionIdx];
                        if (f) {
                          e.preventDefault();
                          const suffix = f.isDir ? "/" : "";
                          const insert = `@"${f.name}${suffix}"`;
                          const ta = inputRef.current;
                          if (ta) {
                            const pos = ta.selectionStart ?? inputText.length;
                            const before = inputText.slice(0, pos);
                            const atIdx = before.lastIndexOf("@");
                            const newText =
                              inputText.slice(0, atIdx) +
                              insert +
                              inputText.slice(pos);
                            setInputText(newText);
                            requestAnimationFrame(() => {
                              ta.selectionStart = ta.selectionEnd =
                                atIdx + insert.length;
                            });
                          }
                          setAtMentionOpen(false);
                          return;
                        }
                      }
                    }
                    handleKeyDown(e);
                  }}
                  onBlur={() =>
                    setTimeout(() => {
                      setAtMentionOpen(false);
                      setSlashMenuOpen(false);
                    }, 150)
                  }
                  placeholder={
                    ompReady
                      ? "输入消息… / 命令  @ 文件  Enter 发送"
                      : "等待 omp 就绪…"
                  }
                  disabled={!ompReady}
                  rows={1}
                />
                {/* Image previews (above textarea, shown when images attached) */}
                {attachedImages.length > 0 && (
                  <div className="omp-image-previews">
                    {attachedImages.map((img, i) => (
                      <div key={i} className="omp-image-preview">
                        <img src={img.dataUrl} alt={img.name} />
                        <button
                          type="button"
                          className="omp-image-preview-remove"
                          onClick={() =>
                            setAttachedImages((prev) =>
                              prev.filter((_, j) => j !== i),
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Composer toolbar: image (left) | model + thinking + send/abort (right) */}
                <div
                  className={`omp-composer-toolbar${modelPickerOpen ? " model-menu-open" : ""}`}
                >
                  <div className="omp-composer-toolbar-left">
                    {/* Image attachment */}
                    <button
                      type="button"
                      className="omp-input-icon-btn"
                      title="附加图片"
                      disabled={!ompReady}
                      onClick={() => imageInputRef.current?.click()}
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
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: "none" }}
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []);
                        const results = await Promise.all(
                          files.map(
                            (f) =>
                              new Promise<{
                                dataUrl: string;
                                name: string;
                                mediaType: string;
                                data: string;
                              }>((resolve) => {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const dataUrl = reader.result as string;
                                  const [header, data] = dataUrl.split(",");
                                  const mediaType =
                                    header.match(/data:([^;]+)/)?.[1] ??
                                    "image/png";
                                  resolve({
                                    dataUrl,
                                    name: f.name,
                                    mediaType,
                                    data: data ?? "",
                                  });
                                };
                                reader.readAsDataURL(f);
                              }),
                          ),
                        );
                        setAttachedImages((prev) => [...prev, ...results]);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  <div className="omp-composer-toolbar-right">
                    {/* Model picker — opens upward */}
                    <div style={{ position: "relative" }}>
                      <button
                        type="button"
                        className={`omp-model-btn${modelPickerOpen ? " open" : ""}`}
                        disabled={!ompReady}
                        onClick={() => {
                          if (modelPickerOpen) {
                            setModelPickerOpen(false);
                            return;
                          }
                          const rawSettings =
                            api.loadSettingsFromDisk?.() ?? null;
                          type ProviderEntry = {
                            id: string;
                            name: string;
                            type: string;
                            apiHost: string;
                            apiKey: string;
                            enabled: boolean;
                            models: string[];
                          };
                          let settings: { providers?: ProviderEntry[] } | null =
                            null;
                          try {
                            settings = rawSettings
                              ? JSON.parse(rawSettings)
                              : null;
                          } catch {
                            /* JSON.parse failure */
                          }
                          const items: typeof modelPickerItems = [];
                          for (const p of settings?.providers ?? []) {
                            if (!p.enabled) continue;
                            for (const m of p.models ?? []) {
                              items.push({
                                label: `${p.name} / ${m}`,
                                provider: p.id,
                                modelId: m,
                                inOmp: false,
                              });
                            }
                          }
                          setModelPickerItems(items);
                          setModelPickerOpen(true);
                        }}
                      >
                        {ompModel ?? "模型"}
                        <span className="omp-model-btn-caret">▾</span>
                      </button>
                      {modelPickerOpen && (
                        <>
                          <div
                            className="omp-model-overlay"
                            onClick={() => setModelPickerOpen(false)}
                          />
                          <div className="omp-model-picker omp-model-picker-up">
                            {modelPickerItems.length === 0 ? (
                              <div className="omp-model-empty">
                                没有配置可用模型（在应用设置中添加 Provider）
                              </div>
                            ) : (
                              modelPickerItems.map((item) => (
                                <button
                                  key={`${item.provider}/${item.modelId}`}
                                  type="button"
                                  className={`omp-model-item${item.inOmp ? " known" : ""}`}
                                  onClick={async () => {
                                    setModelPickerOpen(false);
                                    const result = await api
                                      .invoke("omp:set_model", {
                                        provider: item.provider,
                                        modelId: item.modelId,
                                      })
                                      .catch(() => null);
                                    if (result != null) {
                                      setOmpModel(item.modelId);
                                      // Refresh contextWindow from omp's model state
                                      api
                                        .invoke("omp:get_state")
                                        .then((state: unknown) => {
                                          const s = state as {
                                            model?: { contextWindow?: number };
                                          } | null;
                                          if (s?.model?.contextWindow != null)
                                            modelContextWindowRef.current =
                                              s.model.contextWindow;
                                        })
                                        .catch(() => {});
                                    } else {
                                      // Model not known to omp yet: write the
                                      // provider into ~/.omp/agent/models.yml,
                                      // then force-restart omp so it reloads
                                      // the config.  pendingModelSwitch is
                                      // applied on the next omp:ready event.
                                      setOmpModel(item.modelId);
                                      setOmpReady(false);
                                      type PE = {
                                        id: string;
                                        name: string;
                                        type: string;
                                        apiHost: string;
                                        apiKey: string;
                                        enabled: boolean;
                                        models: string[];
                                      };
                                      let s: { providers?: PE[] } | null = null;
                                      try {
                                        s = JSON.parse(
                                          api.loadSettingsFromDisk?.() ??
                                            "null",
                                        );
                                      } catch {
                                        /* skip */
                                      }
                                      const prov = s?.providers?.find(
                                        (p) => p.id === item.provider,
                                      );
                                      // write_provider_to_models returns
                                      // { safeName } — the sanitized key used
                                      // in models.yml.  omp's set_model RPC
                                      // expects this key, not the raw id.
                                      let providerKey = item.provider;
                                      if (prov) {
                                        const writeResult = (await api
                                          .invoke(
                                            "omp:write_provider_to_models",
                                            { provider: prov },
                                          )
                                          .catch(() => null)) as {
                                          safeName?: string;
                                        } | null;
                                        if (writeResult?.safeName)
                                          providerKey = writeResult.safeName;
                                      }
                                      pendingModelSwitch.current = {
                                        provider: providerKey,
                                        modelId: item.modelId,
                                      };
                                      // force: true restarts omp even when
                                      // already running, so models.yml is
                                      // reloaded and omp:ready fires again.
                                      await api
                                        .invoke("omp:start", { force: true })
                                        .catch(() => {});
                                    }
                                  }}
                                >
                                  <span className="omp-model-item-label">
                                    {item.label}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    {/* Thinking level dropdown */}
                    <select
                      className="omp-thinking-select"
                      value={thinkingLevel}
                      disabled={!ompReady}
                      title="思考强度"
                      onChange={async (e) => {
                        const level = e.target.value as
                          | "off"
                          | "low"
                          | "medium"
                          | "high";
                        setThinkingLevel(level);
                        await api
                          .invoke("omp:set_thinking_level", { level })
                          .catch(() => {});
                      }}
                    >
                      <option value="off">思考: 关闭</option>
                      <option value="low">思考: 低</option>
                      <option value="medium">思考: 中</option>
                      <option value="high">思考: 高</option>
                    </select>
                    {isStreaming ? (
                      <button
                        type="button"
                        className="omp-btn omp-btn-abort"
                        onClick={() => api.invoke("omp:abort").catch(() => {})}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="omp-btn omp-btn-send"
                        onClick={handleSend}
                        disabled={
                          !ompReady ||
                          (!inputText.trim() && attachedImages.length === 0)
                        }
                      >
                        <SendIcon />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* File browser sidebar */}
          {fileBrowserOpen && atMentionCwd && (
            <OmpFileBrowser
              rootDir={atMentionCwd}
              onInsertFile={(path) => {
                const insert = `@"${path}"`;
                setInputText(
                  (prev) =>
                    prev +
                    (prev.endsWith(" ") || !prev ? "" : " ") +
                    insert +
                    " ",
                );
                inputRef.current?.focus();
              }}
              onClose={() => setFileBrowserOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
