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
import { useAgentChatSession } from "../../hooks/useAgentChatSession";
import {
  type AgentConfig,
  type AgentSkillDescriptor,
} from "../../shared/agent";
import type { ChatMode } from "../../shared/chatMode";
import type { ReasoningEffort } from "../../shared/reasoningEffort";
import ChatModeSelector from "../chat/ChatModeSelector";
import ContextUsageMeter from "../chat/ContextUsageMeter";
import SlashCommandMenu from "../chat/SlashCommandMenu";
import ComposerBusyHalo from "../chat/ComposerBusyHalo";
import ComposerQuickMenu from "../chat/ComposerQuickMenu";
import ReasoningEffortSelector from "../chat/ReasoningEffortSelector";
import {
  buildAgentApiMessages,
  filterForAgentHistory,
  trimMessagesForApi,
} from "../../shared/chatMessages";
import {
  applySendFail,
  beginSend,
  clearMessages as clearSessionMessages,
  emptyAgentSessionState,
  genSessionId,
  toggleClearMarker,
  type AgentSessionState,
} from "../../shared/agentSession";
import {
  buildTrimOptions,
  estimateAgentSystemPromptTokens,
  estimateContextUsage,
  resolveActiveModelName,
  resolveContextWindow,
} from "../../shared/contextUsage";
import {
  getChatApiConfig,
  getAgentBackendGuidance,
  updateAgentInSettings,
} from "../../shared/settings";
import { findAgentById } from "../../shared/agent";
import {
  getSettingsSnapshot,
  setSettings,
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
  CompactIcon as CompactGlyph,
  EraserIcon as EraserGlyph,
  SendIcon as SendGlyph,
  StopIcon as StopGlyph,
} from "../icons/naivePatch";
import {
  detachTopicStream,
  abortTopicStream,
  openAgentStream,
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
  return <Icon icon={EraserGlyph} size={16} />;
}

function CompactIcon() {
  return <Icon icon={CompactGlyph} size={16} />;
}

function TrashIcon() {
  return <Icon name="Trash" size={16} />;
}

function SendIcon() {
  return <Icon icon={SendGlyph} size={16} />;
}

function StopIcon() {
  return <Icon icon={StopGlyph} size={14} />;
}

interface TerminalAgentDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTabId: string;
  getActiveSessionId: () => string | undefined;
  // 当前所有终端 tab 的 id 列表 — 用于清理已关闭 tab 的孤立状态与 inflight 请求。
  tabIds: string[];
  /** 跳到终端设置页的「终端助手」分区 */
  onOpenSettings: () => void;
}

type DrawerTabState = AgentSessionState;

function emptyTabState(): DrawerTabState {
  return emptyAgentSessionState();
}

export default function TerminalAgentDrawer({
  isOpen,
  onToggle,
  activeTabId,
  getActiveSessionId,
  tabIds,
  onOpenSettings,
}: TerminalAgentDrawerProps) {
  const [tabStates, setTabStates] = useState<Record<string, DrawerTabState>>(
    {},
  );
  const settings = useSettings();
  const terminalAgent =
    findAgentById(settings.agents, settings.terminalAgentId) ??
    settings.agents.find((a) => a.builtinRole === "terminal-assistant") ??
    null;
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [chatMode, setChatMode] = useState<ChatMode>(
    () => terminalAgent?.chatMode ?? "normal",
  );
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
  // 多标签可同时流式，压缩请求必须按 requestId 记，不能用单值（会被别的标签的 done 清掉）。
  const compactRequestIdsRef = useRef<Set<string>>(new Set());
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

  const contextUsage = useMemo(() => {
    if (!terminalAgent) return null;
    const contextWindow = resolveContextWindow(
      resolveActiveModelName(terminalAgent),
    );
    return estimateContextUsage({
      messages: filterForAgentHistory(activeState.messages),
      input: activeState.input,
      systemTokens: estimateAgentSystemPromptTokens(terminalAgent),
      contextWindow,
      lastPromptTokens: activeState.lastPromptTokens,
      lastCompletionTokens: activeState.lastCompletionTokens,
      lastUsageMessageCount: activeState.lastUsageMessageCount,
    });
  }, [
    terminalAgent,
    activeState.messages,
    activeState.input,
    activeState.lastPromptTokens,
    activeState.lastCompletionTokens,
    activeState.lastUsageMessageCount,
  ]);
  // 智能体会话：流事件路由 / chunk 合帧 / 工具行 upsert 全部走共享 hook。
  const { attachManually } = useAgentChatSession({
    resolveKey: (requestId) => requestIdToTabIdRef.current.get(requestId) ?? null,
    patchState: (tabId, updater) => updateTabState(tabId, updater),
    isCompactRequest: (requestId) => compactRequestIdsRef.current.has(requestId),
    settleCompactRequest: (requestId) => {
      compactRequestIdsRef.current.delete(requestId);
    },
    forgetRequest: (requestId) => {
      requestIdToTabIdRef.current.delete(requestId);
    },
  });

  // Re-attach when switching tabs so in-flight streams replay missed chunks.
  useEffect(() => {
    const topicId = `terminal:${activeTabId}`;

    void (async () => {
      const result = await attachManually(topicId);
      if (result.requestId) {
        requestIdToTabIdRef.current.set(result.requestId, activeTabId);
      }
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
    // attachManually 与 updateTabState 恒稳定。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

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

  // 清理已关闭 tab 的孤立状态：abort inflight 请求、删除 tabStates/知识库勾选、
  // 反向清理 requestIdToTabIdRef 映射。防止关闭标签页后 Agent 仍在后台跑 + 内存泄漏。
  useEffect(() => {
    const liveSet = new Set(tabIds);
    const currentIds = Object.keys(tabStatesRef.current);
    // 知识库勾选也是按 tab 存的，孤儿 tab 的条目要一起丢，否则只增不减。
    const orphanKnowledge = Object.keys(knowledgeIdsByTabRef.current).filter(
      (id) => !liveSet.has(id),
    );
    const orphans = currentIds.filter((id) => !liveSet.has(id));
    if (orphans.length === 0 && orphanKnowledge.length === 0) return;
    for (const orphanId of orphans) {
      const st = tabStatesRef.current[orphanId];
      agentSendLockRef.current.delete(orphanId);
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
    if (orphanKnowledge.length > 0) {
      setKnowledgeIdsByTab((prev) => {
        const next = { ...prev };
        for (const id of orphanKnowledge) delete next[id];
        return next;
      });
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

      // Capture the session before awaiting settings; switching tabs must not retarget this request.
      const sessionId = getActiveSessionId();
      if (!sessionId) {
        AnimalNotification.warning("终端已断开，请重新连接后再发送。");
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
        const agent =
          findAgentById(currentSettings.agents, terminalAgent?.id) ??
          currentSettings.agents.find(
            (a) => a.builtinRole === "terminal-assistant",
          );
        if (!agent) return;
        const guidance = getAgentBackendGuidance(currentSettings, agent);
        if (guidance) {
          updateTabState(activeTabId, (s) =>
            beginSend(s, { requestId: "", userText: finalText, keepInput: isResend }),
          );
          // beginSend 的占位气泡替换为引导错误气泡。
          updateTabState(activeTabId, (s) => {
            const idx = s.messages.length - 1;
            const next = s.messages.slice();
            next[idx] = { ...next[idx], content: guidance, error: true };
            return { ...s, streaming: false, requestId: null, messages: next };
          });
          scrollToBottom();
          return;
        }

        const apiConfig = getChatApiConfig(currentSettings, agent);
        if (!apiConfig?.apiHost || !apiConfig.modelName) {
          AnimalNotification.warning(
            "请先在智能体弹窗中配置终端助手的后端 Provider 与模型。",
          );
          return;
        }

        const history = trimMessagesForApi(
          filterForAgentHistory(state.messages),
          buildTrimOptions({
            contextWindow: resolveContextWindow(
              resolveActiveModelName(agent),
            ),
            systemTokens: estimateAgentSystemPromptTokens(agent),
            draftInput: finalText,
          }),
        );
        const payloadMessages = buildAgentApiMessages(
          history,
          finalText,
          { textFiles: [], images: [] },
          undefined,
        );

        const requestId = genSessionId();
        const topicId = `terminal:${activeTabId}`;
        topicIdRef.current = topicId;
        requestIdToTabIdRef.current.set(requestId, activeTabId);
        if (isCompactRequest) {
          compactRequestIdsRef.current.add(requestId);
        }
        const agentConfig: AgentConfig = {
          ...agent,
          chatMode,
          enabledSkillIds: invokedSkillId
            ? withEnabledSkillId(agent.enabledSkillIds, invokedSkillId)
            : agent.enabledSkillIds,
        };

        updateTabState(activeTabId, (s) =>
          beginSend(s, {
            requestId,
            userText: finalText,
            isCompact: isCompactRequest,
            keepInput: isResend,
          }),
        );
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
            // 抽屉按标签维护知识库勾选；没勾就回落到智能体自身的配置。
            knowledgeBaseIds:
              knowledgeIdsByTabRef.current[activeTabId] ??
              agent.knowledgeBaseIds,
          });
          if (result.mode === "blocked") {
            if (requestIdToTabIdRef.current.get(requestId) !== activeTabId)
              return;
            requestIdToTabIdRef.current.delete(requestId);
            updateTabState(activeTabId, (s) =>
              applySendFail(s, requestId, "该终端已有进行中的会话，请等待完成或先停止。"),
            );
          }
        } catch (e) {
          if (requestIdToTabIdRef.current.get(requestId) !== activeTabId)
            return;
          requestIdToTabIdRef.current.delete(requestId);
          updateTabState(activeTabId, (s) =>
            applySendFail(s, requestId, `请求失败：${e instanceof Error ? e.message : String(e)}`),
          );
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
      terminalAgent?.id,
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
    updateTabState(activeTabId, toggleClearMarker);
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

  // 思维强度写回终端助手配置：发送时抽屉重新读 settings，无需改发送链路。
  const handleReasoningEffortChange = useCallback(
    (value: ReasoningEffort) => {
      if (!terminalAgent) return;
      setSettings(
        updateAgentInSettings(getSettingsSnapshot(), terminalAgent.id, {
          reasoningEffort: value,
        }),
      );
    },
    [terminalAgent],
  );

  const handleClearMessages = useCallback(async () => {
    if (activeState.streaming) return;
    if (activeState.messages.length === 0) return;
    const ok = await confirm({
      title: "清空对话",
      okText: "清空",
      content: "确定清空当前终端标签的 Agent 对话吗？",
    });
    if (!ok) return;
    updateTabState(activeTabId, clearSessionMessages);
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
        const block = `\`\`\`\n${text}
\`\`\``;
        return {
          ...s,
          input: s.input
            ? `${s.input}
\n终端选区：\n${block}`
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
            <span className="terminal-agent-title-name">
              {terminalAgent ? `${terminalAgent.name}` : "终端助手"}
            </span>
          </div>
          <div className="terminal-agent-header-actions">
            <Button
              type="text"
              size="small"
              className="terminal-agent-header-btn"
              icon={<Icon name="Settings" size={14} />}
              onClick={onOpenSettings}
              title="AI 助手设置"
            />
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
              <Tooltip title={"清除上下文"}>
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
              <ChatModeSelector
                mode={chatMode}
                onChange={setChatMode}
                disabled={composerDisabled}
              />
              <ReasoningEffortSelector
                value={terminalAgent?.reasoningEffort ?? "default"}
                onChange={handleReasoningEffortChange}
                disabled={composerDisabled || !terminalAgent}
              />
              <ComposerQuickMenu
                disabled={composerDisabled}
                actions={[
                  {
                    key: "compact",
                    label: "压缩上下文",
                    icon: <CompactIcon />,
                    disabled: activeState.messages.length === 0,
                    onSelect: handleCompact,
                  },
                  {
                    key: "clear",
                    label: "清空消息",
                    icon: <TrashIcon />,
                    danger: true,
                    disabled: activeState.messages.length === 0,
                    onSelect: () => void handleClearMessages(),
                  },
                ]}
                knowledge={{
                  selectedIds: knowledgeIdsByTab[activeTabId] || [],
                  onChange: (ids) =>
                    setKnowledgeIdsByTab((prev) => ({
                      ...prev,
                      [activeTabId]: ids,
                    })),
                }}
              />
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
