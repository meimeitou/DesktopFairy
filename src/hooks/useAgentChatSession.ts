/**
 * useAgentChatSession — 智能体会话的 React 薄封装。
 *
 * 职责（且仅此而已）：
 *  - 订阅 chat:stream:* / agent:stream:tool / citations / knowledge_error
 *  - chunkBuffer 合帧后调 agentSession 状态机
 *  - attach / detach / legacy 回放
 *
 * 状态转移本体在 src/shared/agentSession.ts（纯函数、可测）。
 * 宿主通过 patchState(key, updater) 写状态（同 React setState 的 updater
 * 语义——hook 内部用最新状态跑状态机）；requestId → key 路由由宿主提供。
 */
import { useEffect, useRef } from "react";
import {
  attachTopicStream,
  replayLegacyStreamEvents,
  type LegacyStreamHandlers,
  type StreamAttachResult,
} from "../services/aiTransport/IpcChatTransport";
import {
  applyChunks,
  applyInputMessages,
  emptyAgentSessionState,
  applyCitations,
  applyDone,
  applyError,
  applyKnowledgeError,
  applyToolEvent,
  type AgentSessionState,
  type AgentToolEvent,
  type ChatChunkEvent,
  type ChatDoneEvent,
  type ChatErrorEvent,
  type CitationsEvent,
  type KnowledgeErrorEvent,
} from "../shared/agentSession";
import { createStreamChunkBuffer } from "./createStreamChunkBuffer";

const api = window.electronAPI;

export interface AgentSessionEvents {
  /** done/error 落盘。 */
  onPersist?: (key: string) => void;
  /** 工具行更新（节流落盘用）。 */
  onToolEvent?: (key: string) => void;
  /** maxTurns 到顶（done 非 abort、非 compact）。 */
  onMaxTurnsReached?: (key: string) => void;
  /** compact 结束（含 aborted）。 */
  onCompactSettled?: (key: string, aborted: boolean) => void;
  /** done（非 abort、非 compact）。 */
  onDone?: (key: string) => void;
  /** done 且 aborted。 */
  onAborted?: (key: string) => void;
  /** error 事件。 */
  onError?: (key: string) => void;
  /** 工具进入 running。 */
  onToolRunning?: (key: string) => void;
}

export interface UseAgentChatSessionOptions {
  /** requestId → 会话 key；null = 丢弃事件。 */
  resolveKey: (requestId: string) => string | null;
  /** 状态写入：updater 拿到当前状态，返回状态机的下一份状态。 */
  patchState: (
    key: string,
    updater: (prev: AgentSessionState) => AgentSessionState,
  ) => void;
  /** compact requestId 判定。 */
  isCompactRequest: (requestId: string) => boolean;
  /** done/error 后清宿主的 compact 记录。 */
  settleCompactRequest?: (requestId: string) => void;
  /** done/error 路由成功后清宿主的 requestId→key 映射（防泄漏 + 迟到事件重放）。 */
  forgetRequest?: (requestId: string) => void;
  events?: AgentSessionEvents;
}

export function useAgentChatSession(options: UseAgentChatSessionOptions) {
  // 全部选项走 ref：宿主重建回调不应重挂 IPC 订阅。
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const handlersRef = useRef<LegacyStreamHandlers>({});

  useEffect(() => {
    const chunkBuffer = createStreamChunkBuffer(
      (requestId, parts, reasoning) => {
        const { resolveKey, patchState } = optionsRef.current;
        const key = resolveKey(requestId);
        if (!key) return;
        patchState(key, (prev) => applyChunks(prev, parts, reasoning));
      },
    );

    const handleChunk = (event: ChatChunkEvent) => {
      const key = optionsRef.current.resolveKey(event.requestId);
      if (!key) return;
      chunkBuffer.push(
        event.requestId,
        event.partId,
        event.delta,
        event.reasoning,
      );
    };

    const handleDone = (event: ChatDoneEvent) => {
      chunkBuffer.flushRequest(event.requestId);
      const {
        resolveKey,
        patchState,
        isCompactRequest,
        settleCompactRequest,
        forgetRequest,
      } = optionsRef.current;
      const key = resolveKey(event.requestId);
      if (!key) return;
      const isCompact = isCompactRequest(event.requestId);
      settleCompactRequest?.(event.requestId);
      forgetRequest?.(event.requestId);
      const applyTo = (prev: AgentSessionState) =>
        applyDone(prev, event, { isCompact });
      patchState(key, (prev) => applyTo(prev).state);
      const { meta } = applyTo(emptyAgentSessionState());
      const ev = optionsRef.current.events;
      if (meta.persist) ev?.onPersist?.(key);
      if (isCompact) {
        ev?.onCompactSettled?.(key, Boolean(event.aborted));
        if (!event.aborted) return;
      }
      if (event.aborted) {
        ev?.onAborted?.(key);
        return;
      }
      if (meta.maxTurnsReached) ev?.onMaxTurnsReached?.(key);
      ev?.onDone?.(key);
    };

    const handleError = (event: ChatErrorEvent) => {
      chunkBuffer.flushRequest(event.requestId);
      const { resolveKey, patchState, settleCompactRequest, forgetRequest } = optionsRef.current;
      const key = resolveKey(event.requestId);
      if (!key) return;
      // compact 失败也走这里：settle/forget 对称于 done。
      settleCompactRequest?.(event.requestId);
      forgetRequest?.(event.requestId);
      patchState(key, (prev) => applyError(prev, event).state);
      const ev = optionsRef.current.events;
      ev?.onPersist?.(key);
      ev?.onError?.(key);
    };

    const handleTool = (raw: Record<string, unknown>) => {
      const event = raw as unknown as AgentToolEvent;
      chunkBuffer.flushRequest(event.requestId);
      const { resolveKey, patchState } = optionsRef.current;
      const key = resolveKey(event.requestId);
      if (!key) return;
      patchState(key, (prev) => applyToolEvent(prev, event));
      const ev = optionsRef.current.events;
      ev?.onToolEvent?.(key);
      if (event.status === "running") ev?.onToolRunning?.(key);
    };

    const handleCitations = (event: CitationsEvent) => {
      const { resolveKey, patchState } = optionsRef.current;
      const key = resolveKey(event.requestId);
      if (!key) return;
      patchState(key, (prev) => applyCitations(prev, event));
    };

    const handleKnowledgeError = (event: KnowledgeErrorEvent) => {
      const { resolveKey, patchState } = optionsRef.current;
      const key = resolveKey(event.requestId);
      if (!key) return;
      patchState(key, (prev) => applyKnowledgeError(prev, event));
    };

    const handleInput = (event: import('../shared/agentInputs').AgentInputEvent) => {
      chunkBuffer.flushRequest(event.requestId);
      const { resolveKey, patchState, events } = optionsRef.current;
      const key = resolveKey(event.requestId);
      if (!key) return;
      patchState(key, (prev) => applyInputMessages(prev, event.items));
      events?.onPersist?.(key);
    };

    handlersRef.current = {
      onAgentInput: handleInput,
      onChatChunk: handleChunk,
      onChatDone: handleDone,
      onChatError: handleError,
      onAgentTool: handleTool,
    };

    const offInput = api.onAgentStreamInput?.(handleInput);
    const offChunk = api.onChatStreamChunk(handleChunk);
    const offDone = api.onChatStreamDone(handleDone);
    const offError = api.onChatStreamError(handleError);
    const offTool = api.onAgentStreamTool?.(handleTool);
    const offCitations = api.onChatStreamCitations?.(handleCitations);
    const offKbError = api.onChatStreamKnowledgeError?.(handleKnowledgeError);

    return () => {
      chunkBuffer.dispose();
      offInput?.();
      offChunk?.();
      offDone?.();
      offError?.();
      offTool?.();
      offCitations?.();
      offKbError?.();
    };
  }, []);

  /** 手动 attach（宿主需要控制 hydrate→attach 顺序时用）。 */
  const attachManually = useRef(async (topicId: string, beforeReplay?: (result: StreamAttachResult) => void) => {
    const result = await attachTopicStream(topicId);
    beforeReplay?.(result);
    replayLegacyStreamEvents(result.legacyEvents, handlersRef.current);
    return result;
  });

  return { handlersRef, attachManually: attachManually.current };
}
