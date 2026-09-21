import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import MessageList, { type MessageListHandle } from "../chat/MessageList";
import { ToolCancelContext } from "../chat/agentTools/ToolCancelContext";
import { useToolApproval } from "../../hooks/useToolApproval";
import { useComposerOverlay } from "../../hooks/useComposerOverlay";
import { useConfirm } from "../../hooks/useConfirm";
import { createStreamChunkBuffer } from "../../hooks/createStreamChunkBuffer";
import {
  type AgentConfig,
  type AgentSkillDescriptor,
} from "../../shared/agent";
import type { ChatMode } from "../../shared/chatMode";
import ChatModeSelector from "../chat/ChatModeSelector";
import ContextUsageMeter from "../chat/ContextUsageMeter";
import SlashCommandMenu from "../chat/SlashCommandMenu";
import ComposerBusyHalo from "../chat/ComposerBusyHalo";
import ModelSelector from "../ModelSelector";
import KnowledgePicker from "../knowledge/KnowledgePicker";
import {
  type ChatMsg,
  buildAgentApiMessages,
  filterForAgentHistory,
  findFirstAssistantReplyIndex,
  findLastAssistantReplyIndex,
  pruneEmptyAssistantMessages,
  reconcileToolMessages,
  upsertAgentToolMessage,
  trimMessagesForApi,
} from "../../shared/chatMessages";
import {
  buildTrimOptions,
  estimateAgentSystemPromptTokens,
  estimateContextUsage,
  resolveActiveModelName,
  resolveContextWindow,
} from "../../shared/contextUsage";
import type { ToolTerminalState } from "../../shared/ai/stream";
import {
  getSelectableModelItems,
  getChatApiConfig,
  getAgentBackendGuidance,
} from "../../shared/settings";
import {
  getSettingsSnapshot,
  useSettings,
  flushSettingsSave,
} from "../../shared/settingsStore";
import { useSlashCommandMenu } from "../../hooks/useSlashCommandMenu";
import {
  COMPACT_PROMPT,
  parseSlashCommand,
  getBuiltinCommands,
  buildSkillCommands,
  applySkillSlashCommand,
  withEnabledSkillId,
  type SlashCommand,
} from "../../shared/slashCommands";
import {
  Button,
  Icon,
  Notification as AnimalNotification,
  Tooltip,
} from "animal-island-ui";
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
  return <Icon name="Edit" size={16} />;
}

function CompactIcon() {
  return <Icon name="Chat" size={16} />;
}

function TrashIcon() {
  return <Icon name="Trash" size={16} />;
}

function SendIcon() {
  return <Icon name="Play" size={16} />;
}

function StopIcon() {
  return <Icon name="Close" size={14} />;
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
  /** Session-locked model override ("" = follow agent default). In-memory only. */
  sessionModel: string;
  lastPromptTokens?: number;
  lastCompletionTokens?: number;
  lastUsageMessageCount?: number;
}

function emptyTabState(): DrawerTabState {
  return {
    messages: [],
    input: "",
    streaming: false,
    requestId: null,
    sessionModel: "",
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
  const settings = useSettings();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [chatMode, setChatMode] = useState<ChatMode>("normal");
  const [drawerWidth, setDrawerWidth] = useState(DRAWER_MIN_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [knowledgeIdsByTab, setKnowledgeIdsByTab] = useState<
    Record<string, string[]>
  >({});
  const [skills, setSkills] = useState<AgentSkillDescriptor[]>([]);
  const knowledgeIdsByTabRef = useRef(knowledgeIdsByTab);

  const tabStatesRef = useRef(tabStates);
  const requestIdToTabIdRef = useRef<Map<string, string>>(new Map());
  const compactRequestIdRef = useRef<string | null>(null);
  const handleClearContextRef = useRef<() => void>(() => {});
  const handleSendRef = useRef<(text?: string) => void>(() => {});
  const agentSendLockRef = useRef(new Set<string>());
  const resizeStartRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  useComposerOverlay(dockRef);

  useEffect(() => {
    tabStatesRef.current = tabStates;
  }, [tabStates]);

  useEffect(() => {
    knowledgeIdsByTabRef.current = knowledgeIdsByTab;
  }, [knowledgeIdsByTab]);

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
  const composerDisabled = activeState.streaming || !!editingMsgId;

  const slashCommands = useMemo(
    () => [...getBuiltinCommands(), ...buildSkillCommands(skills)],
    [skills],
  );
  const {
    open: showSlashMenu,
    query: slashQuery,
    hostRef: slashHostRef,
    close: closeSlashMenu,
  } = useSlashCommandMenu(activeState.input, composerDisabled, slashCommands);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = (await api.invoke(
          "agent:skills:scan",
        )) as AgentSkillDescriptor[];
        if (!cancelled) setSkills(Array.isArray(list) ? list : []);
      } catch {
        /* no skills */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    submitToolAnswer,
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
        const next = updater(current);
        tabStatesRef.current = { ...tabStatesRef.current, [tabId]: next };
        return { ...prev, [tabId]: next };
      });
    },
    [],
  );

  const selectableModels = useMemo(
    () => getSelectableModelItems(settings).map((i) => i.value),
    [settings],
  );
  const modelLabels = useMemo(
    () =>
      Object.fromEntries(
        getSelectableModelItems(settings).map((i) => [i.value, i.label]),
      ),
    [settings],
  );
  /** Dropdown shows the session override, or the agent default when unlocked. */
  const agentDefaultModel = useMemo(() => {
    const provider = settings.providers.find(
      (p) => p.id === settings.agent.providerId && p.enabled,
    );
    if (!provider || !settings.agent.modelName) return "";
    return `${provider.id}::${settings.agent.modelName}`;
  }, [settings]);

  const handleSessionModelChange = useCallback(
    (model: string) => {
      updateTabState(activeTabId, (s) => ({ ...s, sessionModel: model }));
    },
    [updateTabState, activeTabId],
  );

  const contextUsage = useMemo(() => {
    const modelName = resolveActiveModelName(
      settings,
      activeState.sessionModel,
    );
    const contextWindow = resolveContextWindow(modelName);
    return estimateContextUsage({
      messages: filterForAgentHistory(activeState.messages),
      input: activeState.input,
      systemTokens: estimateAgentSystemPromptTokens(settings.agent),
      contextWindow,
      lastPromptTokens: activeState.lastPromptTokens,
      lastCompletionTokens: activeState.lastCompletionTokens,
      lastUsageMessageCount: activeState.lastUsageMessageCount,
    });
  }, [
    settings,
    activeState.sessionModel,
    activeState.messages,
    activeState.input,
    activeState.lastPromptTokens,
    activeState.lastCompletionTokens,
    activeState.lastUsageMessageCount,
  ]);

  const mergeToolMessage = useCallback(
    (tabId: string, event: AgentStreamToolEvent) => {
      updateTabState(tabId, (state) => ({
        ...state,
        messages: upsertAgentToolMessage(state.messages, {
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          toolArgs: event.toolArgs,
          toolApprovalId: event.approvalId,
          toolStatus: event.status,
          toolMessage: event.message,
          toolResultPreview: event.resultPreview,
        }),
      }));
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
      replayLegacyStreamEvents(
        result.legacyEvents,
        legacyStreamHandlersRef.current,
      );
      if (
        result.attached &&
        result.status === "streaming" &&
        result.requestId
      ) {
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
        if (delta) {
          next[idx] = { ...next[idx], content: next[idx].content + delta };
        }
        if (reasoning) {
          const ri = Math.max(0, findFirstAssistantReplyIndex(state.messages));
          next[ri] = {
            ...next[ri],
            reasoning: (next[ri].reasoning ?? "") + reasoning,
          };
        }
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
      usage,
    }: {
      requestId: string;
      aborted?: boolean;
      tools?: ToolTerminalState[];
      usage?: { promptTokens?: number; completionTokens?: number };
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
        const reconciled = pruneEmptyAssistantMessages(
          reconcileToolMessages(state.messages, tools, Boolean(aborted)),
        );
        const next = {
          ...state,
          streaming: false,
          requestId: null,
          messages: reconciled,
          ...(usage?.promptTokens != null && usage.promptTokens > 0
            ? {
                lastPromptTokens: usage.promptTokens,
                lastCompletionTokens: usage.completionTokens,
                lastUsageMessageCount: filterForAgentHistory(reconciled).length,
              }
            : {}),
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
            return {
              ...next,
              lastPromptTokens: undefined,
              lastCompletionTokens: undefined,
              lastUsageMessageCount: undefined,
              messages: [
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
              ],
            };
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
    setEditingMsgId(null);
    scrollToBottom();
  }, [activeTabId, scrollToBottom]);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const state = tabStatesRef.current[activeTabId];
      if (!state || state.streaming) return;
      if (agentSendLockRef.current.has(activeTabId)) return;
      const isResend = overrideText !== undefined;
      const isCompactRequest = overrideText === COMPACT_PROMPT;
      const text = (overrideText ?? state.input).trim();
      if (!isCompactRequest && !text) return;

      if (!overrideText && parseSlashCommand(text)?.command === "clear") {
        handleClearContextRef.current();
        updateTabState(activeTabId, (s) => ({ ...s, input: "" }));
        return;
      }

      agentSendLockRef.current.add(activeTabId);
      try {
        let finalText = text;
        let invokedSkillId: string | undefined;
        if (!overrideText) {
          const applied = applySkillSlashCommand(
            text,
            skills.map((s) => s.id),
          );
          if (applied) {
            finalText = applied.text;
            invokedSkillId = applied.skillId;
          }
        }

        await flushSettingsSave();
        const currentSettings = getSettingsSnapshot();
        const guidance = getAgentBackendGuidance(currentSettings);
        if (guidance) {
          const now = Date.now();
          updateTabState(activeTabId, (s) => ({
            ...s,
            messages: [
              ...s.messages,
              { id: genId(), role: "user", content: finalText, timestamp: now },
              {
                id: genId(),
                role: "assistant",
                content: guidance,
                error: true,
                timestamp: now,
              },
            ],
            input: isResend ? s.input : "",
            streaming: false,
            requestId: null,
          }));
          scrollToBottom();
          return;
        }

        const apiConfig = getChatApiConfig(currentSettings);
        if (!apiConfig?.apiHost || !apiConfig.modelName) {
          AnimalNotification.warning(
            "请先在设置中配置 Agent 后端 Provider 与模型。",
          );
          return;
        }

        const sessionId = getActiveSessionId();
        const history = trimMessagesForApi(
          filterForAgentHistory(state.messages),
          buildTrimOptions({
            contextWindow: resolveContextWindow(
              resolveActiveModelName(currentSettings, state.sessionModel),
            ),
            systemTokens: estimateAgentSystemPromptTokens(
              currentSettings.agent,
            ),
            draftInput: finalText,
          }),
        );
        const payloadMessages = buildAgentApiMessages(
          history,
          finalText,
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
          enabledSkillIds: invokedSkillId
            ? withEnabledSkillId(
                currentSettings.agent.enabledSkillIds,
                invokedSkillId,
              )
            : currentSettings.agent.enabledSkillIds,
        };

        updateTabState(activeTabId, (s) => ({
          ...s,
          messages: [
            ...s.messages,
            { id: genId(), role: "user", content: finalText, timestamp: now },
            { id: genId(), role: "assistant", content: "", timestamp: now },
          ],
          input: isResend ? s.input : "",
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
            sessionModel: state.sessionModel,
            terminalSessionId: sessionId,
          });
          if (result.mode === "blocked") {
            if (requestIdToTabIdRef.current.get(requestId) !== activeTabId)
              return;
            requestIdToTabIdRef.current.delete(requestId);
            updateTabState(activeTabId, (s) => {
              const owns = s.requestId === requestId;
              const idx = findLastAssistantReplyIndex(s.messages);
              if (idx < 0) {
                return owns ? { ...s, streaming: false, requestId: null } : s;
              }
              const next = s.messages.slice();
              next[idx] = {
                ...next[idx],
                content: "该终端已有进行中的会话，请等待完成或先停止。",
                error: true,
              };
              return owns
                ? { ...s, messages: next, streaming: false, requestId: null }
                : { ...s, messages: next };
            });
          }
        } catch (e) {
          if (requestIdToTabIdRef.current.get(requestId) !== activeTabId)
            return;
          requestIdToTabIdRef.current.delete(requestId);
          updateTabState(activeTabId, (s) => {
            const owns = s.requestId === requestId;
            const idx = findLastAssistantReplyIndex(s.messages);
            if (idx < 0) {
              return owns ? { ...s, streaming: false, requestId: null } : s;
            }
            const next = s.messages.slice();
            next[idx] = {
              ...next[idx],
              content: `请求失败：${e instanceof Error ? e.message : String(e)}`,
              error: true,
            };
            return owns
              ? { ...s, messages: next, streaming: false, requestId: null }
              : { ...s, messages: next };
          });
        }
      } finally {
        agentSendLockRef.current.delete(activeTabId);
      }
    },
    [
      activeTabId,
      chatMode,
      getActiveSessionId,
      updateTabState,
      scrollToBottom,
      skills,
    ],
  );

  useEffect(() => {
    handleSendRef.current = (text?: string) => {
      void handleSend(text);
    };
  }, [handleSend]);

  const resendFromUserMessage = useCallback(
    (msgId: string, newText: string) => {
      const state = tabStatesRef.current[activeTabId];
      if (!state || state.streaming) return;
      const idx = state.messages.findIndex((m) => m.id === msgId);
      if (idx === -1) return;
      const target = state.messages[idx];
      if (target.role !== "user") return;
      const trimmed = newText.trim();
      if (!trimmed) return;
      const kept = state.messages.slice(0, idx);
      setEditingMsgId(null);
      updateTabState(activeTabId, (s) => ({ ...s, messages: kept }));
      setTimeout(() => handleSendRef.current(trimmed), 0);
    },
    [activeTabId, updateTabState],
  );

  const handleRetry = useCallback(
    (msgId: string) => {
      const state = tabStatesRef.current[activeTabId];
      if (!state || state.streaming) return;
      const idx = state.messages.findIndex((m) => m.id === msgId);
      if (idx === -1) return;
      const target = state.messages[idx];
      if (target.role !== "user") return;
      resendFromUserMessage(msgId, target.content);
    },
    [activeTabId, resendFromUserMessage],
  );

  const handleStartEdit = useCallback((msgId: string) => {
    setEditingMsgId(msgId);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMsgId(null);
  }, []);

  const handleConfirmEdit = useCallback(
    (msgId: string, newText: string) => {
      resendFromUserMessage(msgId, newText);
    },
    [resendFromUserMessage],
  );

  const handleStop = useCallback(() => {
    const state = tabStatesRef.current[activeTabId];
    if (state?.requestId) {
      abortTopicStream(`terminal:${activeTabId}`, state.requestId);
      void api.invoke("agent:abort", { requestId: state.requestId });
    }
  }, [activeTabId]);

  const handleCancelTool = useCallback((toolCallId: string) => {
    void api.invoke("agent:tool:cancel", { toolCallId });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSlashMenu) {
        if (
          e.key === "ArrowDown" ||
          e.key === "ArrowUp" ||
          e.key === "Enter" ||
          e.key === "Escape" ||
          e.key === "Tab"
        ) {
          e.preventDefault();
        }
        return;
      }
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (!composerDisabled) {
          void handleSend();
        }
      }
    },
    [composerDisabled, handleSend, showSlashMenu],
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
      return {
        ...s,
        messages: nextMessages,
        lastPromptTokens: undefined,
        lastCompletionTokens: undefined,
        lastUsageMessageCount: undefined,
      };
    });
    scrollToBottom();
  }, [
    activeState.streaming,
    activeState.messages.length,
    activeTabId,
    updateTabState,
    scrollToBottom,
  ]);

  useEffect(() => {
    handleClearContextRef.current = handleClearContext;
  }, [handleClearContext]);

  const handleSlashCommand = useCallback(
    (cmd: SlashCommand) => {
      if (cmd.group === "skill" && cmd.insertText) {
        setActiveInput(cmd.insertText);
        return;
      }
      if (cmd.group === "builtin" && cmd.id === "clear") {
        setActiveInput("");
        handleClearContext();
        return;
      }
      if (cmd.group === "builtin" && cmd.id === "compact") {
        setActiveInput("");
        void handleSend(COMPACT_PROMPT);
      }
    },
    [setActiveInput, handleClearContext, handleSend],
  );

  const handleCompact = useCallback(() => {
    if (activeState.streaming) return;
    if (activeState.messages.length === 0) return;
    void handleSend(COMPACT_PROMPT);
  }, [activeState.streaming, activeState.messages.length, handleSend]);

  const handleClearMessages = useCallback(async () => {
    if (activeState.streaming) return;
    if (activeState.messages.length === 0) return;
    const ok = await confirm({
      title: "清空对话",
      okText: "清空",
      content: "确定清空当前终端标签的 Agent 对话吗？",
    });
    if (!ok) return;
    updateTabState(activeTabId, (s) => ({
      ...s,
      messages: [],
      input: "",
      lastPromptTokens: undefined,
      lastCompletionTokens: undefined,
      lastUsageMessageCount: undefined,
    }));
  }, [
    activeState.streaming,
    activeState.messages.length,
    activeTabId,
    updateTabState,
    confirm,
  ]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { text } = (e as CustomEvent<{ text?: string }>).detail ?? {};
      if (!text) return;
      updateTabState(activeTabId, (s) => {
        const block = `\`\`\`\n${text}\n\`\`\``;
        return {
          ...s,
          input: s.input
            ? `${s.input}\n\n终端选区：\n${block}`
            : `终端选区：\n${block}`,
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

  const emptyContent = useMemo(
    () => (
      <div className="terminal-agent-empty">
        <span className="terminal-agent-empty-icon">
          <Icon name="Butterfly" size={36} />
        </span>
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
            <ModelSelector
              models={selectableModels}
              value={activeState.sessionModel || agentDefaultModel}
              modelLabels={modelLabels}
              onChange={handleSessionModelChange}
              allowCustom={false}
              disabled={composerDisabled}
              variant="toolbar"
            />
          </div>
          <div className="terminal-agent-header-actions">
            <Button
              type="text"
              size="small"
              className="terminal-agent-header-btn"
              icon={<Icon name="Close" size={14} />}
              onClick={onToggle}
              title="关闭抽屉"
            />
          </div>
        </div>
        <ToolCancelContext.Provider value={handleCancelTool}>
          <MessageList
            ref={messageListRef}
            className="terminal-agent-messages"
            messages={activeState.messages}
            streaming={activeState.streaming}
            onApprove={handleApproveTool}
            onDeny={handleDenyTool}
            onAlwaysAllow={handleAlwaysAllowTool}
            onAnswer={submitToolAnswer}
            submittingApprovalId={submittingApprovalId}
            alwaysAllowLabel="本次全部允许"
            onRetry={activeState.streaming ? undefined : handleRetry}
            onStartEdit={activeState.streaming ? undefined : handleStartEdit}
            onConfirmEdit={handleConfirmEdit}
            onCancelEdit={handleCancelEdit}
            editingMsgId={editingMsgId}
            emptyContent={emptyContent}
          />
        </ToolCancelContext.Provider>

        <div
          ref={dockRef}
          className={`terminal-agent-dock${activeState.streaming ? " is-busy" : ""}`}
          aria-busy={activeState.streaming}
        >
          <ComposerBusyHalo />
          <div className="terminal-agent-editor" ref={slashHostRef}>
            {showSlashMenu && (
              <SlashCommandMenu
                commands={slashCommands}
                query={slashQuery}
                onSelect={handleSlashCommand}
                onClose={closeSlashMenu}
              />
            )}
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder={
                composerDisabled
                  ? editingMsgId
                    ? "正在编辑上方消息…"
                    : "生成中…"
                  : "输入消息，Enter 发送…"
              }
              value={activeState.input}
              onChange={(e) => setActiveInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={composerDisabled}
            />
          </div>
          <div className="chat-input-toolbar">
            <div className="chat-input-tools-left">
              <KnowledgePicker
                selectedIds={knowledgeIdsByTab[activeTabId] || []}
                onChange={(ids) =>
                  setKnowledgeIdsByTab((prev) => ({
                    ...prev,
                    [activeTabId]: ids,
                  }))
                }
                disabled={composerDisabled}
              />
              <ChatModeSelector
                mode={chatMode}
                onChange={setChatMode}
                disabled={composerDisabled}
              />
              <Tooltip title={"清空上下文"}>
                <Button
                  type="text"
                  size="small"
                  className="chat-tool-btn"
                  icon={<EraserIcon />}
                  onClick={handleClearContext}
                  disabled={
                    composerDisabled || activeState.messages.length === 0
                  }
                />
              </Tooltip>
              <Tooltip title={"压缩上下文"}>
                <Button
                  type="text"
                  size="small"
                  className="chat-tool-btn"
                  icon={<CompactIcon />}
                  onClick={handleCompact}
                  disabled={
                    composerDisabled || activeState.messages.length === 0
                  }
                />
              </Tooltip>
              <Tooltip title={"删除上下文"}>
                <Button
                  type="text"
                  size="small"
                  className="chat-tool-btn chat-tool-btn-danger"
                  icon={<TrashIcon />}
                  onClick={() => void handleClearMessages()}
                  disabled={
                    composerDisabled || activeState.messages.length === 0
                  }
                />
              </Tooltip>
            </div>
            <div className="chat-input-toolbar-right">
              <ContextUsageMeter
                usage={contextUsage}
                disabled={composerDisabled}
              />
              {activeState.streaming ? (
                <Button
                  type="text"
                  size="small"
                  className="chat-send-btn chat-stop-btn"
                  icon={<StopIcon />}
                  onClick={handleStop}
                  aria-label="停止生成"
                  title="停止生成"
                />
              ) : (
                <Button
                  type="text"
                  size="small"
                  className="chat-send-btn"
                  icon={<SendIcon />}
                  onClick={() => void handleSend()}
                  disabled={composerDisabled || !activeState.input.trim()}
                  aria-label="发送消息"
                  title="发送消息 (Enter)"
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {confirmDialog}
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
    | "awaiting_input"
    | "running"
    | "done"
    | "error"
    | "denied";
  message?: string;
  resultPreview?: string;
}
