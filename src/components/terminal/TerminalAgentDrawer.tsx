import { hostsForContinuation } from "../../shared/hostSelection";
import { readTerminalAgentRecovery, rememberTerminalAgent, restoreTerminalAgent } from "../../shared/terminalAgentRecovery";
import type { Tab } from "./terminalSidebarGroups";
import AgentPendingInputs from "../chat/AgentPendingInputs";
import { useAgentInputs } from "../../hooks/useAgentInputs";
import AgentInteractionPanel from "../chat/AgentInteractionPanel";
import { getPendingInteractions } from "../chat/agentTools/interactionState";
import { hasReferenceTask, retainedReferences } from "../../shared/composerReferences";
import { Button, NormalTooltip, warning } from "@cherrystudio/ui";
import { CircleStop, Eraser, FoldVertical, Send, Settings, Sparkles, Trash2, X } from "lucide-react";
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
import SkillComposerEditor from "../chat/SkillComposerEditor";
import ComposerBusyHalo from "../chat/ComposerBusyHalo";
import ComposerQuickMenu from "../chat/ComposerQuickMenu";
import ReasoningEffortSelector from "../chat/ReasoningEffortSelector";
import {
  buildAgentApiMessages,
  filterForAgentHistory,
  trimMessagesForApi,
} from "../../shared/chatMessages";
import {
  beginSend,
  acceptSendDraft,
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
import {
  COMPACT_PROMPT,
  parseSlashCommand,
  getBuiltinCommands,
  buildSkillCommands,
  buildHostCommands,
  type SlashCommand,
} from "../../shared/slashCommands";

import {
  detachTopicStream,
  abortTopicStream,
  openAgentStream,
  agentStreamRejection,
} from "../../services/aiTransport/IpcChatTransport";
import "../../pages/ChatPage.css";
import "./TerminalAgentDrawer.css";

import { prepareSkillInvocation, type SkillResendOptions } from "../../shared/skillInvocation";

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
  return <Eraser size={16} />;
}

function CompactIcon() {
  return <FoldVertical size={16} />;
}

function TrashIcon() {
  return <Trash2 size={16} />;
}

function SendIcon() {
  return <Send size={16} />;
}

function StopIcon() {
  return <CircleStop size={16} />;
}

interface TerminalAgentDrawerProps {
  isOpen: boolean;
  isActive?: boolean;
  onToggle: () => void;
  activeTabId: string;
  getActiveSessionId: () => string | undefined;
  // 当前所有终端 tab 的 id 列表 — 用于清理已关闭 tab 的孤立状态与 inflight 请求。
  tabIds: string[];
  terminalTabs: Tab[];
  /** 跳到终端设置页的「终端助手」分区 */
  onOpenSettings: () => void;
}

type DrawerTabState = AgentSessionState;

function emptyTabState(): DrawerTabState {
  return emptyAgentSessionState();
}

export default function TerminalAgentDrawer({
  isOpen,
  isActive = true,
  onToggle,
  activeTabId,
  getActiveSessionId,
  tabIds,
  terminalTabs,
  onOpenSettings,
}: TerminalAgentDrawerProps) {
  const [tabStates, setTabStates] = useState<Record<string, DrawerTabState>>(
    {},
  );
  const settings = useSettings();
  const agentInputs = useAgentInputs(`terminal:${activeTabId}`);
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
  const agentSendLockRef = useRef(new Set<string>());
  const resizeStartRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );
  // browser resume: keyed by topicId so the right tab picks it up
  const browserResumeByTopicRef = useRef<Map<string, { topicId: string; tabId: string }>>(new Map());
  // stable ref to handleSend so the resume effect doesn't re-subscribe on every send
  const handleSendRef = useRef<(text?: string) => Promise<void>>(async () => {});
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

  useEffect(() => {
    const tracked = new Set(readTerminalAgentRecovery().map((r) => r.tab.id));
    const timer = setTimeout(() => {
      for (const tab of terminalTabs) {
        const state = tabStates[tab.id];
        if (!state || !tracked.has(tab.id)) continue;
        try { rememberTerminalAgent(tab, state); }
        catch { /* Main-owned pending inputs remain on disk even if renderer storage is full. */ }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [tabStates, terminalTabs]);

  // Ensure a session exists for the active tab.
  useEffect(() => {
    setTabStates((prev) => {
      if (prev[activeTabId]) return prev;
      return { ...prev, [activeTabId]: restoreTerminalAgent(activeTabId) };
    });
  }, [activeTabId]);

  const activeState = tabStates[activeTabId] ?? emptyTabState();
  const awaitingInteraction = getPendingInteractions(activeState.messages).length > 0;
  const composerDisabled = activeState.streaming || awaitingInteraction || !!editingMsgId;
  const draftDisabled = !!editingMsgId;

  const slashCommands = useMemo(
    () => [...getBuiltinCommands(), ...buildHostCommands(settings.sshHosts), ...buildSkillCommands(skills, terminalAgent?.enabledSkillIds)],
    [skills, settings.sshHosts, terminalAgent?.enabledSkillIds],
  );

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
      const result = await attachManually(topicId, (attached) => {
        if (attached.requestId) requestIdToTabIdRef.current.set(attached.requestId, activeTabId);
      });
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
    async (overrideText?: string, options?: SkillResendOptions) => {
      const state = tabStatesRef.current[activeTabId];
      if (!state) return;
      if (agentSendLockRef.current.has(activeTabId)) return;
      if (state.streaming) {
        if (overrideText !== undefined || !state.requestId || !state.input.trim()) return;
        agentSendLockRef.current.add(activeTabId);
        try {
          if (state.selectedSkillIds?.length || state.selectedHosts?.length) { warning('执行中补充请先移除技能或主机选择，当前执行配置保持不变。'); return; }
          const recoveryTab = terminalTabs.find((t) => t.id === activeTabId);
          if (recoveryTab) rememberTerminalAgent(recoveryTab, state);
          const queued = await agentInputs.enqueue(state.requestId, { message: {
            id: genSessionId(), role: 'user', content: state.input.trim(), timestamp: Date.now(),
          }, apiMessage: { role: 'user', content: state.input.trim() } });
          if (!queued) { setTimeout(() => void handleSendRef.current(), 0); return; }
          updateTabState(activeTabId, (live) => ({ ...live, input: live.input === state.input ? '' : live.input }));
          const tab = terminalTabs.find((t) => t.id === activeTabId);
          if (tab) rememberTerminalAgent(tab, tabStatesRef.current[activeTabId]);
          scrollToBottom();
        } catch (e) { warning(`补充发送失败：${String(e)}`); }
        finally { agentSendLockRef.current.delete(activeTabId); }
        return;
      }
      const isResend = overrideText !== undefined;
      const isCompactRequest = overrideText === COMPACT_PROMPT;
      const text = (overrideText ?? state.input).trim();
      if (!isCompactRequest && !text && !(overrideText === '' && agentInputs.pending.length)) return;

      if (!overrideText && parseSlashCommand(text)?.command === "clear") {
        handleClearContextRef.current();
        updateTabState(activeTabId, (s) => ({ ...s, input: "" }));
        return;
      }

      const selectedHosts = overrideText === '' ? hostsForContinuation(state.messages) : isResend ? (options?.selectedHosts || []) : (state.selectedHosts || []);
      // Capture the session before awaiting settings; switching tabs must not retarget this request.
      const sessionId = getActiveSessionId();
      if (!sessionId && !selectedHosts.length) {
        warning("终端已断开，请重新连接后再发送。");
        return;
      }
      agentSendLockRef.current.add(activeTabId);
      try {
        const invocation = prepareSkillInvocation(text,
          isResend ? (options?.selectedSkillIds || []) : (state.selectedSkillIds || []), skills.map((sk) => sk.id), selectedHosts);
        if (overrideText !== '' && (invocation.selectedSkillIds.length || selectedHosts.length) && !hasReferenceTask(invocation.rawText, invocation.selectedSkillIds, selectedHosts)) {
          warning("请输入要执行的任务。");
          return;
        }
        const finalText = overrideText === '' ? '' : invocation.text;
        const sendMessages = options?.resendMessageId
          ? state.messages.slice(0, state.messages.findIndex((m) => m.id === options.resendMessageId)) : state.messages;

        await flushSettingsSave();
        const currentSettings = getSettingsSnapshot();
        const agent =
          findAgentById(currentSettings.agents, terminalAgent?.id) ??
          currentSettings.agents.find(
            (a) => a.builtinRole === "terminal-assistant",
          );
        if (!agent) return;
        const guidance = getAgentBackendGuidance(currentSettings, agent);
        const apiConfig = getChatApiConfig(currentSettings, agent);
        const configError = guidance ?? (!apiConfig?.apiHost || !apiConfig.modelName
          ? "智能体尚未配置后端 Provider 或模型，请在智能体设置中完成配置。"
          : null);
        if (configError) {
          updateTabState(activeTabId, (s) => ({
            ...s,
            messages: [
              ...s.messages,
              {
                id: genSessionId(),
                role: "assistant" as const,
                content: configError,
                error: true,
                errorKind: "model_config" as const,
                timestamp: Date.now(),
              },
            ],
          }));
          return;
        }
        if (!apiConfig?.apiHost || !apiConfig.modelName) return;

        const history = trimMessagesForApi(
          filterForAgentHistory(sendMessages),
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

        if (overrideText === '') payloadMessages.pop();
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

        };

        updateTabState(activeTabId, (s) =>
          beginSend({ ...s, messages: sendMessages }, {
            requestId,
            userText: finalText,
            selectedSkillIds: invocation.selectedSkillIds,
            selectedHosts,
            rawText: invocation.rawText,
            isCompact: isCompactRequest,
            keepInput: true,
          }),
        );
        scrollToBottom();

        try {
          const result = await openAgentStream({
            userMessage: text && !isCompactRequest ? tabStatesRef.current[activeTabId]?.messages.slice().reverse().find((m) => m.role === 'user') : undefined,
            selectedSkillIds: invocation.selectedSkillIds,
            selectedHosts,
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
            terminalSessionId: selectedHosts.length ? undefined : sessionId,
            // 抽屉按标签维护知识库勾选；没勾就回落到智能体自身的配置。
            knowledgeBaseIds:
              knowledgeIdsByTabRef.current[activeTabId] ??
              agent.knowledgeBaseIds,
          });
          const rejection = agentStreamRejection(result);
          if (rejection) {
            requestIdToTabIdRef.current.delete(requestId);
            compactRequestIdsRef.current.delete(requestId);
            updateTabState(activeTabId, () => ({ ...state, skillErrors: result.skillErrors, hostErrors: result.hostErrors }));
            warning(rejection);
          } else {
            updateTabState(activeTabId, (s) => acceptSendDraft(s, isResend, state));
          }
        } catch (e) {
          requestIdToTabIdRef.current.delete(requestId);
          compactRequestIdsRef.current.delete(requestId);
          updateTabState(activeTabId, () => state);
          warning(`请求失败：${e instanceof Error ? e.message : String(e)}`);
        }
      } finally {
        agentSendLockRef.current.delete(activeTabId);
      }
    },
    [
      activeTabId,
      agentInputs,
      chatMode,
      getActiveSessionId,
      updateTabState,
      scrollToBottom,
      skills,
      terminalAgent?.id,
      terminalTabs,
    ],
  );

  // Keep handleSendRef current so the browser resume effect can call it without
  // re-subscribing to the IPC event on every render.
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  // Subscribe to browser-resume events (fires when the user clicks "继续" in the
  // browser pane after manually taking over a paused browser task).
  useEffect(() => {
    const off = api.onBrowserResume?.((task) => {
      if (!task.topicId.startsWith("terminal:")) return;
      browserResumeByTopicRef.current.set(task.topicId, task);
    });
    return () => off?.();
  }, []);

  // Auto-send the resume prompt once the right tab is active and not streaming.
  useEffect(() => {
    const topicId = `terminal:${activeTabId}`;
    const task = browserResumeByTopicRef.current.get(topicId);
    if (!task || activeState.streaming) return;
    browserResumeByTopicRef.current.delete(topicId);
    void api.invoke("browser:ui", { action: "discard", topicId: task.topicId });
    void handleSendRef.current(
      `继续之前的浏览器任务。用户已手动接管过页面，请先用 browser_tabs 确认标签页，再重新读取标签页 ${task.tabId} 的快照，根据当前页面继续；不要重放之前的提交动作。`,
    );
  }, [activeTabId, activeState.streaming]);

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
      setEditingMsgId(null);
      const references = retainedReferences(trimmed, target.selectedSkillIds, target.selectedHosts);
      void handleSend(trimmed, { selectedSkillIds: references.skillIds, selectedHosts: references.hosts, resendMessageId: msgId });
    },
    [activeTabId, handleSend],
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
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (!draftDisabled) {
          void handleSend();
        }
      }
    },
    [draftDisabled, handleSend],
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
    await api.invoke('ai:stream_inputs_clear', { topicId: `terminal:${activeTabId}` });
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
          <Sparkles size={36} />
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
            <Button variant="ghost" size="sm" className="terminal-agent-header-btn" onClick={onOpenSettings} title="AI 助手设置"><Settings size={14} /></Button>
            <Button variant="ghost" size="sm" className="terminal-agent-header-btn" onClick={onToggle} title="关闭抽屉"><X size={14} /></Button>
          </div>
        </div>
        <ToolCancelContext.Provider value={handleCancelTool}>
          <MessageList
            ref={messageListRef}
            className="terminal-agent-messages"
            pendingContent={<AgentPendingInputs pending={agentInputs.pending} streaming={activeState.streaming} withdraw={agentInputs.withdraw}
              onContinue={() => void handleSend('')}
              onRestore={(message) => updateTabState(activeTabId, (s) => ({ ...s, input: [s.input, message.content].filter(Boolean).join('\n') }))} />}
            messages={activeState.messages}
            streaming={activeState.streaming}
            onRetry={activeState.streaming ? undefined : handleRetry}
            onStartEdit={activeState.streaming ? undefined : handleStartEdit}
            onConfirmEdit={handleConfirmEdit}
            onCancelEdit={handleCancelEdit}
            editingMsgId={editingMsgId}
            emptyContent={emptyContent}
            onEditAgent={() => onOpenSettings()}
          />
        </ToolCancelContext.Provider>

        <div
          ref={dockRef}
          className={`terminal-agent-dock${activeState.streaming ? " is-busy" : ""}`}
          aria-busy={activeState.streaming}
        >
          <ComposerBusyHalo />
          <AgentInteractionPanel sessionId={`terminal:${activeTabId}`} messages={activeState.messages} active={isOpen && isActive}
            submittingApprovalId={submittingApprovalId} alwaysAllowLabel="本次全部允许"
            onApprove={handleApproveTool} onDeny={handleDenyTool}
            onAlwaysAllow={handleAlwaysAllowTool} onAnswer={submitToolAnswer} />
          <div className="terminal-agent-editor">
            <SkillComposerEditor key={activeTabId}
              textareaRef={textareaRef} rows={1}
              placeholder={activeState.streaming ? "输入补充，下一步生效…" : awaitingInteraction ? "可继续编辑草稿，请先处理上方请求…" : composerDisabled ? (editingMsgId ? "正在编辑上方消息…" : "生成中…") : "输入消息，@ 选择技能，Enter 发送…"}
              input={activeState.input} onInputChange={setActiveInput}
              commands={activeState.streaming ? [] : awaitingInteraction ? slashCommands.filter((cmd) => cmd.group === "skill" || cmd.group === "host") : slashCommands} onCommand={handleSlashCommand}
              selectedHosts={activeState.selectedHosts} hostErrors={activeState.hostErrors}
              onSelectedHostsChange={(hosts) => updateTabState(activeTabId, (s) => ({ ...s, selectedHosts: hosts, hostErrors: undefined }))}
              selectedSkillIds={activeState.selectedSkillIds} skillErrors={activeState.skillErrors}
              onSelectedSkillIdsChange={(ids) => updateTabState(activeTabId, (s) => ({ ...s, selectedSkillIds: ids, skillErrors: undefined }))}
              onKeyDown={handleKeyDown} disabled={draftDisabled}
            />
          </div>
          <div className="chat-input-toolbar">
            <div className="chat-input-tools-left">
              <NormalTooltip content="清除上下文">
                <Button variant="ghost" size="sm" className="chat-tool-btn" onClick={handleClearContext} disabled={
                    composerDisabled || activeState.messages.length === 0
                  }><EraserIcon /></Button>
              </NormalTooltip>
              <ChatModeSelector
                mode={chatMode}
                onChange={setChatMode}
                disabled={composerDisabled}
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
                  selectedIds: knowledgeIdsByTab[activeTabId] ?? terminalAgent?.knowledgeBaseIds ?? [],
                  onChange: (ids) =>
                    setKnowledgeIdsByTab((prev) => ({
                      ...prev,
                      [activeTabId]: ids,
                    })),
                }}
              />
            </div>
            <div className="chat-input-toolbar-right">
              <ReasoningEffortSelector
                value={terminalAgent?.reasoningEffort ?? "default"}
                onChange={handleReasoningEffortChange}
                disabled={composerDisabled || !terminalAgent}
              />
              <ContextUsageMeter
                usage={contextUsage}
                disabled={composerDisabled}
              />
              {activeState.streaming && <Button variant="ghost" size="sm" className="chat-send-btn" onClick={() => void handleSend()} disabled={draftDisabled || !activeState.input.trim()} aria-label="发送补充" title="发送补充 (Enter)"><SendIcon /></Button>}
              {activeState.streaming ? (
                <Button variant="ghost" size="sm" className="chat-send-btn chat-stop-btn" onClick={handleStop} aria-label="停止生成" title="停止生成"><StopIcon /></Button>
              ) : (
                <Button variant="ghost" size="sm" className="chat-send-btn" onClick={() => void handleSend()} disabled={composerDisabled || !activeState.input.trim()} aria-label="发送消息" title="发送消息 (Enter)"><SendIcon /></Button>
              )}
            </div>
          </div>
        </div>
      </div>
      {confirmDialog}
    </aside>
  );
}
