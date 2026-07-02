import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import MessageBubble from "../chat/MessageBubble";
import ToolCallBubble, { ToolCallGroup } from "../chat/ToolCallBubble";
import { TerminalStopContext } from "../chat/agentTools/TerminalStopContext";
import { useToolApproval } from "../../hooks/useToolApproval";
import { useStickToBottom } from "../../hooks/useStickToBottom";
import { getAgentBackendLabel, type AgentConfig } from "../../shared/agent";
import type { ChatMode } from "../../shared/chatMode";
import ChatModeSelector from "../chat/ChatModeSelector";
import {
  type ChatMsg,
  buildAgentApiMessages,
  filterForApi,
  findLastAssistantReplyIndex,
  trimMessagesForApi,
} from "../../shared/chatMessages";
import { getChatCompletionsUrl } from "../../shared/providers";
import {
  loadSettings,
  getChatApiConfig,
  type AppSettings,
} from "../../shared/settings";
import { COMPACT_PROMPT, parseSlashCommand } from "../../shared/slashCommands";
import Tooltip from "../Tooltip";
import "../../pages/ChatPage.css";
import "./TerminalAgentDrawer.css";

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

function ContextClearDivider() {
  return (
    <div className="msg-context-clear" role="separator">
      <span>上下文已清除</span>
    </div>
  );
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

  const tabStatesRef = useRef(tabStates);
  const settingsRef = useRef(settings);
  const requestIdToTabIdRef = useRef<Map<string, string>>(new Map());
  const compactRequestIdRef = useRef<string | null>(null);
  const handleClearContextRef = useRef<() => void>(() => {});

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

  // Ensure a session exists for the active tab.
  useEffect(() => {
    setTabStates((prev) => {
      if (prev[activeTabId]) return prev;
      return { ...prev, [activeTabId]: emptyTabState() };
    });
  }, [activeTabId]);

  const activeState = tabStates[activeTabId] ?? emptyTabState();

  const messagesRef = useRef(activeState.messages);
  const requestIdRef = useRef(activeState.requestId ?? "");

  useEffect(() => {
    messagesRef.current = activeState.messages;
  }, [activeState.messages]);

  useEffect(() => {
    requestIdRef.current = activeState.requestId ?? "";
  }, [activeState.requestId]);

  const {
    submittingApprovalId,
    handleApproveTool,
    handleDenyTool,
    handleAlwaysAllowTool,
  } = useToolApproval(messagesRef, () => {}, requestIdRef);

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
        const toolMsg: ChatMsg = {
          id: prevTool?.id || genId(),
          role: "assistant",
          type: "tool",
          content: "",
          toolCallId: event.toolCallId || prevTool?.toolCallId,
          toolName: event.toolName,
          toolArgs: event.toolArgs ?? prevTool?.toolArgs,
          toolApprovalId: event.approvalId ?? prevTool?.toolApprovalId,
          toolStatus: event.status,
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

  // Stream listeners.
  useEffect(() => {
    const offChunk = api.onChatStreamChunk?.(({ requestId, delta, reasoning }) => {
      const tabId = requestIdToTabIdRef.current.get(requestId);
      if (!tabId) return;
      updateTabState(tabId, (state) => {
        const idx = findLastAssistantReplyIndex(state.messages);
        if (idx < 0) return state;
        const next = state.messages.slice();
        const target = next[idx];
        next[idx] = {
          ...target,
          ...(typeof delta === "string" ? { content: target.content + delta } : {}),
          ...(typeof reasoning === "string"
            ? { reasoning: (target.reasoning ?? "") + reasoning }
            : {}),
        };
        return { ...state, messages: next };
      });
    });

    const offDone = api.onChatStreamDone?.(({ requestId, aborted }) => {
      const tabId = requestIdToTabIdRef.current.get(requestId);
      if (!tabId) return;
      requestIdToTabIdRef.current.delete(requestId);
      const isCompact = compactRequestIdRef.current === requestId;
      compactRequestIdRef.current = null;
      updateTabState(tabId, (state) => {
        const next = { ...state, streaming: false, requestId: null };
        if (aborted) {
          next.messages = state.messages.map((m) =>
            m.type === "tool" &&
            (m.toolStatus === "streaming" ||
              m.toolStatus === "running" ||
              m.toolStatus === "awaiting_approval")
              ? { ...m, toolStatus: "error" as const, toolMessage: "已取消" }
              : m,
          );
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
              ...state.messages,
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
    });

    const offError = api.onChatStreamError?.(({ requestId, message }) => {
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
    });

    const offTool = api.onAgentStreamTool?.((event) => {
      const tabId = requestIdToTabIdRef.current.get(event.requestId);
      if (!tabId) return;
      mergeToolMessage(tabId, event);
    });

    return () => {
      offChunk?.();
      offDone?.();
      offError?.();
      offTool?.();
    };
  }, [mergeToolMessage, updateTabState]);

  // Abort any inflight runs on unmount.
  useEffect(() => {
    return () => {
      for (const state of Object.values(tabStatesRef.current)) {
        if (state.requestId) {
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

  const { containerRef: messagesContainerRef, handleScroll, scrollToBottom } =
    useStickToBottom(activeState.messages);

  // Center an awaiting-approval tool card in the viewport so the user notices it.
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-tool-approval-id]");
    if (!card) return;
    card.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeState.messages]);

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

    const history = trimMessagesForApi(filterForApi(state.messages));
    const payloadMessages = buildAgentApiMessages(
      history,
      text,
      { textFiles: [], images: [] },
      undefined,
    );

    const requestId = genId();
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

    const chatUrl = getChatCompletionsUrl(
      apiConfig.apiHost,
      apiConfig.providerType,
    );

    try {
      await api.invoke("agent:run", {
        requestId,
        messages: payloadMessages,
        chatUrl,
        apiConfig: {
          apiHost: apiConfig.apiHost,
          apiKey: apiConfig.apiKey,
          providerType: apiConfig.providerType,
          modelName: apiConfig.modelName,
        },
        agentConfig,
        temperature: currentSettings.temperature,
        terminalSessionId: sessionId,
      });
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
    };
    window.addEventListener("terminal:add-to-chat", handler);
    return () => window.removeEventListener("terminal:add-to-chat", handler);
  }, [activeTabId, updateTabState]);

  const agentLabel = useMemo(
    () => getAgentBackendLabel(settings.agent),
    [settings.agent],
  );

  const renderMessages = () => {
    const { messages, streaming } = activeState;
    if (messages.length === 0) {
      return (
        <div className="terminal-agent-empty">
          <span className="terminal-agent-empty-icon">🧚‍♀️</span>
          <p>开始和终端 Agent 对话</p>
          <small>Agent 可以发送命令到当前终端并读取结果</small>
        </div>
      );
    }

    const nodes: ReactNode[] = [];
    let i = 0;
    const streamingAssistantIdx = streaming
      ? findLastAssistantReplyIndex(messages)
      : -1;
    const streamingAssistantId =
      streamingAssistantIdx >= 0 ? messages[streamingAssistantIdx].id : null;

    while (i < messages.length) {
      const m = messages[i];
      if (m.type === "clear") {
        nodes.push(<ContextClearDivider key={m.id} />);
        i += 1;
        continue;
      }
      if (m.type === "tool") {
        const batch: ChatMsg[] = [];
        while (i < messages.length && messages[i].type === "tool") {
          batch.push(messages[i]);
          i += 1;
        }
        nodes.push(
          batch.length > 1 ? (
            <ToolCallGroup
              key={batch[0].id}
              tools={batch}
              onApprove={handleApproveTool}
              onDeny={handleDenyTool}
              onAlwaysAllow={handleAlwaysAllowTool}
              submittingApprovalId={submittingApprovalId}
              alwaysAllowLabel="本次全部允许"
            />
          ) : (
            <ToolCallBubble
              key={batch[0].id}
              msg={batch[0]}
              onApprove={handleApproveTool}
              onDeny={handleDenyTool}
              onAlwaysAllow={handleAlwaysAllowTool}
              submittingApprovalId={submittingApprovalId}
              alwaysAllowLabel="本次全部允许"
            />
          ),
        );
        continue;
      }
      nodes.push(
        <MessageBubble
          key={m.id}
          msg={m}
          streaming={streaming}
          isStreamingTarget={m.id === streamingAssistantId}
          invalidAttachmentPaths={new Set()}
        />,
      );
      i += 1;
    }
    return nodes;
  };

  return (
    <aside className={`terminal-agent-drawer${isOpen ? " open" : ""}`}>
      <div className="terminal-agent-drawer-content">
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

        <div className="terminal-agent-messages" ref={messagesContainerRef} onScroll={handleScroll}>
          <TerminalStopContext.Provider value={handleStopTerminal}>
            {renderMessages()}
          </TerminalStopContext.Provider>
        </div>

        <div className="terminal-agent-input-shell">
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
          </div>
          <div className="terminal-agent-input-row">
            <textarea
              rows={1}
              placeholder={
                activeState.streaming ? "生成中…" : "输入消息，Enter 发送…"
              }
              value={activeState.input}
              onChange={(e) => setActiveInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={activeState.streaming}
            />
            {activeState.streaming ? (
              <button
                type="button"
                className="terminal-agent-send-btn terminal-agent-stop-btn"
                onClick={handleStop}
              >
                停止
              </button>
            ) : (
              <button
                type="button"
                className="terminal-agent-send-btn"
                onClick={() => void handleSend()}
                disabled={!activeState.input.trim()}
              >
                发送
              </button>
            )}
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
