import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import MessageList, {
  type MessageListHandle,
} from "../chat/MessageList";
import { TerminalStopContext } from "../chat/agentTools/TerminalStopContext";
import { useToolApproval } from "../../hooks/useToolApproval";
import { createStreamChunkBuffer } from "../../hooks/createStreamChunkBuffer";
import { getAgentBackendLabel, type AgentConfig } from "../../shared/agent";
import type { ChatMode } from "../../shared/chatMode";
import ChatModeSelector from "../chat/ChatModeSelector";
import {
  type ChatMsg,
  buildAgentApiMessages,
  filterForAgentHistory,
  findLastAssistantReplyIndex,
  reconcileToolMessages,
  shouldApplyToolStatus,
  trimMessagesForApi,
} from "../../shared/chatMessages";
import type { ToolTerminalState } from "../../shared/ai/stream";
import {
  loadSettings,
  getChatApiConfig,
  getAgentBackendGuidance,
  type AppSettings,
} from "../../shared/settings";
import { COMPACT_PROMPT, parseSlashCommand } from "../../shared/slashCommands";
import Tooltip from "../Tooltip";
import {
  attachTopicStream,
  detachTopicStream,
  abortTopicStream,
  openAgentStream,
  replayLegacyStreamEvents,
  type LegacyStreamHandlers,
} from "../../services/aiTransport/IpcChatTransport";
import "../../pages/ChatPage.css";
import "./TerminalAgentDrawer.css";

const MAX_INPUT_HEIGHT = 140;
const DRAWER_MIN_WIDTH = 360;

function getDrawerMaxWidth(): number {
  return Math.max(DRAWER_MIN_WIDTH, Math.floor(window.innerWidth / 2));
}

function clampDrawerWidth(width: number): number {
  return Math.min(Math.max(width, DRAWER_MIN_WIDTH), getDrawerMaxWidth());
}

const api = window.electronAPI;

function EraserIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.6 1.6c.8-.8 2-.8 2.8 0l5 5c.8.8.8 2 0 2.8L11 20" />
      <path d="M6 11l7 7" />
    </svg>
  );
}

function CompactIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="4" x2="20" y2="4" />
      <line x1="4" y1="20" x2="20" y2="20" />
      <polyline points="9 9 12 12 15 9" />
      <polyline points="9 15 12 12 15 15" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

interface TerminalAgentDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTabId: string;
  getActiveSessionId: () => string | undefined;
  // 当前所有终端 tab 的 id 列表 — 用于清理已关闭 tab 的孤立状态与 inflight 请求。
  tabIds: string[];
}

interface DrawerTabState {
  messages: ChatMsg[];
  input: string;
  streaming: boolean;
  requestId: string | null;
}

function emptyTabState(): DrawerTabState {
  return {
    messages: [],
    input: "",
    streaming: false,
    requestId: null,
  };
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function TerminalAgentDrawer({
  isOpen,
  onToggle,
  activeTabId,
  getActiveSessionId,
  tabIds,
}: TerminalAgentDrawerProps) {
  const [tabStates, setTabStates] = useState<Record<string, DrawerTabState>>(
    {},
  );
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [chatMode, setChatMode] = useState<ChatMode>("normal");
  const [drawerWidth, setDrawerWidth] = useState(DRAWER_MIN_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  const tabStatesRef = useRef(tabStates);
  const settingsRef = useRef(settings);
  const requestIdToTabIdRef = useRef<Map<string, string>>(new Map());
  const compactRequestIdRef = useRef<string | null>(null);
  const handleClearContextRef = useRef<() => void>(() => {});
  const resizeStartRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    tabStatesRef.current = tabStates;
  }, [tabStates]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const off = api.onSettingsUpdated?.(() => {
      setSettings(loadSettings());
    });
    return () => off?.();
  }, []);

  useEffect(() => {
    const onWindowResize = () => {
      setDrawerWidth((w) => clampDrawerWidth(w));
    };
    window.addEventListener("resize", onWindowResize);
    return () => window.removeEventListener("resize", onWindowResize);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.userSelect = prevUserSelect;
    };
  }, [isResizing]);

  const handleResizePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!isOpen) return;
      e.preventDefault();
      resizeStartRef.current = { startX: e.clientX, startWidth: drawerWidth };
      setIsResizing(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [drawerWidth, isOpen],
  );

  const handleResizePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const start = resizeStartRef.current;
      if (!start) return;
      const next = clampDrawerWidth(
        start.startWidth + (start.startX - e.clientX),
      );
      setDrawerWidth(next);
    },
    [],
  );

  const handleResizePointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!resizeStartRef.current) return;
      resizeStartRef.current = null;
      setIsResizing(false);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [],
  );

  // Ensure a session exists for the active tab.
  useEffect(() => {
    setTabStates((prev) => {
      if (prev[activeTabId]) return prev;
      return { ...prev, [activeTabId]: emptyTabState() };
    });
  }, [activeTabId]);

  const activeState = tabStates[activeTabId] ?? emptyTabState();

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [activeState.input, adjustHeight]);

  const messagesRef = useRef(activeState.messages);
  const requestIdRef = useRef(activeState.requestId ?? "");
  const topicIdRef = useRef<string | null>(`terminal:${activeTabId}`);
  const legacyStreamHandlersRef = useRef<LegacyStreamHandlers>({});

  useEffect(() => {
    messagesRef.current = activeState.messages;
  }, [activeState.messages]);

  useEffect(() => {
    requestIdRef.current = activeState.requestId ?? "";
  }, [activeState.requestId]);

  useEffect(() => {
    topicIdRef.current = `terminal:${activeTabId}`;
  }, [activeTabId]);

  const {
    submittingApprovalId,
    handleApproveTool,
    handleDenyTool,
    handleAlwaysAllowTool,
  } = useToolApproval(messagesRef, () => {}, requestIdRef, topicIdRef);

  const setActiveInput = useCallback(
    (value: string) => {
      setTabStates((prev) => {
        const current = prev[activeTabId] ?? emptyTabState();
        return { ...prev, [activeTabId]: { ...current, input: value } };
      });
    },
    [activeTabId],
  );

  const updateTabState = useCallback(
    (tabId: string, updater: (state: DrawerTabState) => DrawerTabState) => {
      setTabStates((prev) => {
        const current = prev[tabId] ?? emptyTabState();
        return { ...prev, [tabId]: updater(current) };
      });
    },
    [],
  );

  const mergeToolMessage = useCallback(
    (tabId: string, event: AgentStreamToolEvent) => {
      updateTabState(tabId, (state) => {
        const msgs = state.messages;
        // 仅按 toolCallId 精确匹配 — 避免并发同名工具（如两个 Read）误合并。
        // readSseResponse 已为缺失 id 的情况提供 call_${index} 兜底，
        // 所以缺失 toolCallId 时直接走新建路径（existingIdx = -1）。
        const existingIdx = event.toolCallId
          ? msgs.findIndex(
              (m) => m.type === "tool" && m.toolCallId === event.toolCallId,
            )
          : -1;
        const prevTool = existingIdx >= 0 ? msgs[existingIdx] : null;
        const nextStatus = shouldApplyToolStatus(prevTool?.toolStatus, event.status)
          ? event.status
          : prevTool?.toolStatus;
        const toolMsg: ChatMsg = {
          id: prevTool?.id || genId(),
          role: "assistant",
          type: "tool",
          content: "",
          toolCallId: event.toolCallId || prevTool?.toolCallId,
          toolName: event.toolName,
          toolArgs: event.toolArgs ?? prevTool?.toolArgs,
          toolApprovalId: event.approvalId ?? prevTool?.toolApprovalId,
          toolStatus: nextStatus,
          toolMessage: event.message ?? prevTool?.toolMessage,
          toolResultPreview: event.resultPreview ?? prevTool?.toolResultPreview,
          timestamp: prevTool?.timestamp || Date.now(),
        };
        let nextMessages: ChatMsg[];
        if (existingIdx >= 0) {
          nextMessages = msgs.slice();
          nextMessages[existingIdx] = toolMsg;
        } else {
          const assistantIdx = findLastAssistantReplyIndex(msgs);
          if (assistantIdx < 0) {
            nextMessages = [...msgs, toolMsg];
          } else {
            nextMessages = msgs.slice();
            // 始终把工具消息插入到 assistant 占位之后，并在其后追加新的空 assistant
            // 占位 — 保证工具卡片出现在模型回复之后，符合"模型调用工具"的语义。
            // （之前的 else 分支会插入到空 assistant 占位之前，导致视觉时序错乱。）
            nextMessages.splice(assistantIdx + 1, 0, toolMsg);
            nextMessages.push({
              id: genId(),
              role: "assistant",
              content: "",
              timestamp: Date.now(),
            });
          }
        }
        return { ...state, messages: nextMessages };
      });
    },
    [updateTabState],
  );

  // Re-attach when switching tabs so in-flight streams replay missed chunks.
  useEffect(() => {
    const topicId = `terminal:${activeTabId}`;

    void (async () => {
      const result = await attachTopicStream(topicId);
      if (result.requestId) {
        requestIdToTabIdRef.current.set(result.requestId, activeTabId);
      }
      replayLegacyStreamEvents(result.legacyEvents, legacyStreamHandlersRef.current);
      if (result.attached && result.status === "streaming" && result.requestId) {
        updateTabState(activeTabId, (state) => ({
          ...state,
          streaming: true,
          requestId: result.requestId!,
        }));
      }
    })();

    return () => {
      detachTopicStream(topicId);
    };
  }, [activeTabId, updateTabState]);

  // Stream listeners.
  useEffect(() => {
    const applyChunk = (
      requestId: string,
      delta: string,
      reasoning: string,
    ) => {
      const tabId = requestIdToTabIdRef.current.get(requestId);
      if (!tabId) return;
      updateTabState(tabId, (state) => {
        const idx = findLastAssistantReplyIndex(state.messages);
        if (idx < 0) return state;
        const next = state.messages.slice();
        const target = next[idx];
        next[idx] = {
          ...target,
          ...(delta ? { content: target.content + delta } : {}),
          ...(reasoning
            ? { reasoning: (target.reasoning ?? "") + reasoning }
            : {}),
        };
        return { ...state, messages: next };
      });
    };

    const chunkBuffer = createStreamChunkBuffer(applyChunk);

    const handleChatChunk = ({
      requestId,
      delta,
      reasoning,
    }: {
      requestId: string;
      delta?: string;
      reasoning?: string;
    }) => {
      const tabId = requestIdToTabIdRef.current.get(requestId);
      if (!tabId) return;
      chunkBuffer.push(requestId, delta, reasoning);
    };

    const handleChatDone = ({
      requestId,
      aborted,
      tools,
    }: {
      requestId: string;
      aborted?: boolean;
      tools?: ToolTerminalState[];
    }) => {
      chunkBuffer.flushRequest(requestId);
      const tabId = requestIdToTabIdRef.current.get(requestId);
      if (!tabId) return;
      setTimeout(() => {
        requestIdToTabIdRef.current.delete(requestId);
      }, 0);
      const isCompact = compactRequestIdRef.current === requestId;
      compactRequestIdRef.current = null;
      updateTabState(tabId, (state) => {
        const reconciled = reconcileToolMessages(
          state.messages,
          tools,
          Boolean(aborted),
        );
        const next = {
          ...state,
          streaming: false,
          requestId: null,
          messages: reconciled,
        };
        if (aborted) {
          return next;
        }
        if (isCompact) {
          const assistantIdx = findLastAssistantReplyIndex(state.messages);
          const summary =
            assistantIdx >= 0 && !state.messages[assistantIdx].error
              ? state.messages[assistantIdx].content
              : "";
          if (summary.trim()) {
            next.messages = [
              ...reconciled,
              {
                id: genId(),
                role: "user" as const,
                type: "clear" as const,
                content: "",
                timestamp: Date.now(),
              } as ChatMsg,
              {
                id: genId(),
                role: "user" as const,
                content: `[上下文摘要]\n\n${summary.trim()}`,
                timestamp: Date.now(),
              } as ChatMsg,
            ];
          }
          return next;
        }
        return next;
      });
    };

    const handleChatError = ({
      requestId,
      message,
    }: {
      requestId: string;
      message: string;
    }) => {
      chunkBuffer.flushRequest(requestId);
      const tabId = requestIdToTabIdRef.current.get(requestId);
      if (!tabId) return;
      requestIdToTabIdRef.current.delete(requestId);
      updateTabState(tabId, (state) => {
        const idx = findLastAssistantReplyIndex(state.messages);
        if (idx < 0) {
          return { ...state, streaming: false, requestId: null };
        }
        const next = state.messages.slice();
        const target = next[idx];
        next[idx] = {
          ...target,
          content: target.content || `请求失败：${message}`,
          error: true,
        };
        return { ...state, messages: next, streaming: false, requestId: null };
      });
    };

    const offChunk = api.onChatStreamChunk?.(handleChatChunk);
    const offDone = api.onChatStreamDone?.(handleChatDone);
    const offError = api.onChatStreamError?.(handleChatError);

    const offTool = api.onAgentStreamTool?.((event) => {
      const tabId = requestIdToTabIdRef.current.get(event.requestId);
      if (!tabId) return;
      mergeToolMessage(tabId, event);
    });

    legacyStreamHandlersRef.current = {
      onChatChunk: handleChatChunk,
      onChatDone: handleChatDone,
      onChatError: handleChatError,
      onAgentTool: (data) => {
        const tabId = requestIdToTabIdRef.current.get(
          String(data.requestId || ""),
        );
        if (!tabId) return;
        mergeToolMessage(tabId, data as unknown as AgentStreamToolEvent);
      },
    };

    return () => {
      chunkBuffer.dispose();
      offChunk?.();
      offDone?.();
      offError?.();
      offTool?.();
    };
  }, [mergeToolMessage, updateTabState]);

  // Abort any inflight runs on unmount.
  useEffect(() => {
    return () => {
      for (const [tabId, state] of Object.entries(tabStatesRef.current)) {
        if (state.requestId) {
          abortTopicStream(`terminal:${tabId}`, state.requestId);
          void api.invoke("agent:abort", { requestId: state.requestId });
        }
      }
    };
  }, []);

  // 清理已关闭 tab 的孤立状态：abort inflight 请求、删除 tabStates 条目、
  // 反向清理 requestIdToTabIdRef 映射。防止关闭标签页后 Agent 仍在后台跑 + 内存泄漏。
  useEffect(() => {
    const liveSet = new Set(tabIds);
    const currentIds = Object.keys(tabStatesRef.current);
    const orphans = currentIds.filter((id) => !liveSet.has(id));
    if (orphans.length === 0) return;
    for (const orphanId of orphans) {
      const st = tabStatesRef.current[orphanId];
      if (st?.requestId) {
        abortTopicStream(`terminal:${orphanId}`, st.requestId);
        void api.invoke("agent:abort", { requestId: st.requestId });
      }
    }
    // 反向清理 requestIdToTabIdRef 中指向 orphan tab 的映射。
    for (const [reqId, tabId] of requestIdToTabIdRef.current) {
      if (orphans.includes(tabId)) {
        requestIdToTabIdRef.current.delete(reqId);
      }
    }
    setTabStates((prev) => {
      const next = { ...prev };
      for (const orphanId of orphans) delete next[orphanId];
      return next;
    });
  }, [tabIds]);

  const messageListRef = useRef<MessageListHandle>(null);
  const scrollToBottom = useCallback(() => {
    messageListRef.current?.scrollToBottom();
  }, []);

  // Switching tabs returns to that session's bottom.
  useEffect(() => {
    scrollToBottom();
  }, [activeTabId, scrollToBottom]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const state = tabStatesRef.current[activeTabId];
    if (!state || state.streaming) return;
    const isCompactRequest = overrideText === COMPACT_PROMPT;
    const text = (overrideText ?? state.input).trim();
    if (!isCompactRequest && !text) return;

    if (!overrideText && parseSlashCommand(text)?.command === "clear") {
      handleClearContextRef.current();
      updateTabState(activeTabId, (s) => ({ ...s, input: "" }));
      return;
    }

    const currentSettings = settingsRef.current;
    const guidance = getAgentBackendGuidance(currentSettings);
    if (guidance) {
      const now = Date.now();
      updateTabState(activeTabId, (s) => ({
        ...s,
        messages: [
          ...s.messages,
          { id: genId(), role: "user", content: text, timestamp: now },
          {
            id: genId(),
            role: "assistant",
            content: guidance,
            error: true,
            timestamp: now,
          },
        ],
        input: "",
        streaming: false,
        requestId: null,
      }));
      scrollToBottom();
      return;
    }

    const apiConfig = getChatApiConfig(currentSettings);
    if (!apiConfig?.apiHost || !apiConfig.modelName) {
      alert("请先在设置中配置 Agent 后端 Provider 与模型。");
      return;
    }

    const sessionId = getActiveSessionId();
    if (!sessionId) {
      alert("当前终端会话尚未就绪，请稍后再试。");
      return;
    }

    const history = trimMessagesForApi(filterForAgentHistory(state.messages));
    const payloadMessages = buildAgentApiMessages(
      history,
      text,
      { textFiles: [], images: [] },
      undefined,
    );

    const requestId = genId();
    const topicId = `terminal:${activeTabId}`;
    topicIdRef.current = topicId;
    requestIdToTabIdRef.current.set(requestId, activeTabId);
    if (isCompactRequest) {
      compactRequestIdRef.current = requestId;
    }
    const now = Date.now();

    const agentConfig: AgentConfig = {
      ...currentSettings.agent,
      chatMode,
    };

    updateTabState(activeTabId, (s) => ({
      ...s,
      messages: [
        ...s.messages,
        { id: genId(), role: "user", content: text, timestamp: now },
        { id: genId(), role: "assistant", content: "", timestamp: now },
      ],
      input: "",
      streaming: true,
      requestId,
    }));
    scrollToBottom();


    try {
      const result = await openAgentStream({
        topicId,
        requestId,
        messages: payloadMessages,
        apiConfig: {
          apiHost: apiConfig.apiHost,
          apiKey: apiConfig.apiKey,
          providerType: apiConfig.providerType,
          modelName: apiConfig.modelName,
        },
        agentConfig,
        terminalSessionId: sessionId,
      });
      if (result.mode === "blocked") {
        if (requestIdToTabIdRef.current.get(requestId) !== activeTabId) return;
        requestIdToTabIdRef.current.delete(requestId);
        updateTabState(activeTabId, (s) => {
          const idx = findLastAssistantReplyIndex(s.messages);
          if (idx < 0) {
            return { ...s, streaming: false, requestId: null };
          }
          const next = s.messages.slice();
          next[idx] = {
            ...next[idx],
            content: "该终端已有进行中的会话，请等待完成或先停止。",
            error: true,
          };
          return { ...s, messages: next, streaming: false, requestId: null };
        });
      }
    } catch (e) {
      if (requestIdToTabIdRef.current.get(requestId) !== activeTabId) return;
      requestIdToTabIdRef.current.delete(requestId);
      updateTabState(activeTabId, (s) => {
        const idx = findLastAssistantReplyIndex(s.messages);
        if (idx < 0) {
          return { ...s, streaming: false, requestId: null };
        }
        const next = s.messages.slice();
        next[idx] = {
          ...next[idx],
          content: `请求失败：${e instanceof Error ? e.message : String(e)}`,
          error: true,
        };
        return { ...s, messages: next, streaming: false, requestId: null };
      });
    }
  }, [activeTabId, chatMode, getActiveSessionId, updateTabState, scrollToBottom]);

  const handleStop = useCallback(() => {
    const state = tabStatesRef.current[activeTabId];
    if (state?.requestId) {
      abortTopicStream(`terminal:${activeTabId}`, state.requestId);
      void api.invoke("agent:abort", { requestId: state.requestId });
    }
  }, [activeTabId]);

  const handleStopTerminal = useCallback(() => {
    const sid = getActiveSessionId();
    if (sid) {
      void api.invoke("terminal:agent:stop", { sessionId: sid });
    }
  }, [getActiveSessionId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (!activeState.streaming) {
          void handleSend();
        }
      }
    },
    [activeState.streaming, handleSend],
  );

  const handleClearContext = useCallback(() => {
    if (activeState.streaming) return;
    if (activeState.messages.length === 0) return;
    updateTabState(activeTabId, (s) => {
      const last = s.messages[s.messages.length - 1];
      const nextMessages =
        last.type === "clear"
          ? s.messages.slice(0, -1)
          : [
              ...s.messages,
              {
                id: genId(),
                role: "user" as const,
                type: "clear" as const,
                content: "",
                timestamp: Date.now(),
              } as ChatMsg,
            ];
      return { ...s, messages: nextMessages };
    });
  }, [activeState.streaming, activeState.messages.length, activeTabId, updateTabState]);

  useEffect(() => {
    handleClearContextRef.current = handleClearContext;
  }, [handleClearContext]);

  const handleCompact = useCallback(() => {
    if (activeState.streaming) return;
    if (activeState.messages.length === 0) return;
    void handleSend(COMPACT_PROMPT);
  }, [activeState.streaming, activeState.messages.length, handleSend]);

  const handleClearMessages = useCallback(() => {
    if (activeState.streaming) return;
    if (activeState.messages.length === 0) return;
    if (!window.confirm("确定清空当前终端标签的 Agent 对话吗？")) return;
    updateTabState(activeTabId, (s) => ({
      ...s,
      messages: [],
      input: "",
    }));
  }, [activeState.streaming, activeState.messages.length, activeTabId, updateTabState]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { text } = (e as CustomEvent<{ text?: string }>).detail ?? {};
      if (!text) return;
      updateTabState(activeTabId, (s) => {
        const block = `\`\`\`\n${text}\n\`\`\``;
        return {
          ...s,
          input: s.input ? `${s.input}\n\n终端选区：\n${block}` : `终端选区：\n${block}`,
        };
      });
      // 等 React 提交 input 更新、抽屉打开后再聚焦，光标落在末尾
      window.setTimeout(() => {
        const el = textareaRef.current;
        if (!el || el.disabled) return;
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }, 0);
    };
    window.addEventListener("terminal:add-to-chat", handler);
    return () => window.removeEventListener("terminal:add-to-chat", handler);
  }, [activeTabId, updateTabState]);

  const agentLabel = useMemo(
    () => getAgentBackendLabel(settings.agent),
    [settings.agent],
  );

  const emptyContent = useMemo(
    () => (
      <div className="terminal-agent-empty">
        <span className="terminal-agent-empty-icon">🧚‍♀️</span>
        <p>开始和终端 Agent 对话</p>
        <small>Agent 可以发送命令到当前终端并读取结果</small>
      </div>
    ),
    [],
  );

  return (
    <aside
      className={`terminal-agent-drawer${isOpen ? " open" : ""}${isResizing ? " resizing" : ""}`}
      style={isOpen ? { width: drawerWidth } : undefined}
    >
      <div
        className="terminal-agent-drawer-content"
        style={{ minWidth: drawerWidth }}
      >
        {isOpen && (
          <div
            className="terminal-agent-drawer-resize-handle"
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            role="separator"
            aria-orientation="vertical"
            aria-label="调整抽屉宽度"
            title="拖拽调整宽度"
          />
        )}
        <div className="terminal-agent-header">
          <div className="terminal-agent-title">
            <span className="terminal-agent-subtitle">{agentLabel}</span>
          </div>
          <div className="terminal-agent-header-actions">
            <button
              type="button"
              className="terminal-agent-header-btn"
              onClick={onToggle}
              title="关闭抽屉"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <TerminalStopContext.Provider value={handleStopTerminal}>
          <MessageList
            ref={messageListRef}
            className="terminal-agent-messages"
            messages={activeState.messages}
            streaming={activeState.streaming}
            onApprove={handleApproveTool}
            onDeny={handleDenyTool}
            onAlwaysAllow={handleAlwaysAllowTool}
            submittingApprovalId={submittingApprovalId}
            alwaysAllowLabel="本次全部允许"
            emptyContent={emptyContent}
          />
        </TerminalStopContext.Provider>

        <div className="terminal-agent-input-shell">
          <div className="terminal-agent-dock">
            <div className="terminal-agent-editor">
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder={
                  activeState.streaming ? "生成中…" : "输入消息，Enter 发送…"
                }
                value={activeState.input}
                onChange={(e) => setActiveInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={activeState.streaming}
              />
            </div>
            <div className="chat-input-toolbar">
              <div className="chat-input-tools-left">
                <ChatModeSelector
                  mode={chatMode}
                  onChange={setChatMode}
                  disabled={activeState.streaming}
                />
                <Tooltip tip={"清空上下文\n后续消息不再引用此前对话"}>
                  <button
                    type="button"
                    className="chat-tool-btn"
                    onClick={handleClearContext}
                    disabled={
                      activeState.streaming || activeState.messages.length === 0
                    }
                  >
                    <EraserIcon />
                  </button>
                </Tooltip>
                <Tooltip tip={"压缩上下文\nAI 总结摘要后自动清除旧对话"}>
                  <button
                    type="button"
                    className="chat-tool-btn"
                    onClick={handleCompact}
                    disabled={
                      activeState.streaming || activeState.messages.length === 0
                    }
                  >
                    <CompactIcon />
                  </button>
                </Tooltip>
                <Tooltip tip={"删除上下文\n删除当前会话全部消息"}>
                  <button
                    type="button"
                    className="chat-tool-btn chat-tool-btn-danger"
                    onClick={handleClearMessages}
                    disabled={
                      activeState.streaming || activeState.messages.length === 0
                    }
                  >
                    <TrashIcon />
                  </button>
                </Tooltip>
              </div>
              <div className="chat-input-toolbar-right">
                {activeState.streaming ? (
                  <button
                    type="button"
                    className="chat-send-btn chat-stop-btn"
                    onClick={handleStop}
                    aria-label="停止生成"
                    title="停止生成"
                  >
                    <StopIcon />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="chat-send-btn"
                    onClick={() => void handleSend()}
                    disabled={!activeState.input.trim()}
                    aria-label="发送消息"
                    title="发送消息 (Enter)"
                  >
                    <SendIcon />
                  </button>
                )}
              </div>
            </div>
          </div>
          <p className="terminal-agent-input-hint">
            Enter 发送 · Shift+Enter 换行
          </p>
        </div>
      </div>
    </aside>
  );
}

interface AgentStreamToolEvent {
  requestId: string;
  toolCallId?: string;
  toolName: string;
  toolArgs?: string;
  approvalId?: string;
  status:
    | "streaming"
    | "awaiting_approval"
    | "running"
    | "done"
    | "error"
    | "denied";
  message?: string;
  resultPreview?: string;
}
