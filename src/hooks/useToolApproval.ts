import { error } from "@cherrystudio/ui";
import { useCallback, useState, type MutableRefObject } from "react";
import type { ChatMsg } from "../shared/chatMessages";

const api = window.electronAPI;

export function useToolApproval(
  chatMessagesRef: MutableRefObject<ChatMsg[]>,
  onSwitchToFullAuto: () => void,
  requestIdRef: MutableRefObject<string>,
  topicIdRef?: MutableRefObject<string | null>,
) {
  const [submittingApprovalId, setSubmittingApprovalId] = useState<string | null>(
    null,
  );

  const respondToolApproval = useCallback(
    async (approvalId: string, approved: boolean) => {
      setSubmittingApprovalId(approvalId);
      try {
        const ok = (await api.invoke("agent:tool:approve", {
          approvalId,
          approved,
        })) as boolean;
        if (!ok) {
          // Let AgentInteractionPanel show the inline error; no toast.
        }
        return ok;
      } catch (e) {
        error(e instanceof Error ? e.message : "审批失败");
        return false;
      } finally {
        setSubmittingApprovalId(null);
      }
    },
    [],
  );

  const submitToolAnswer = useCallback(
    async (answerId: string, answers: Record<string, string>) => {
      setSubmittingApprovalId(answerId);
      try {
        const ok = (await api.invoke("agent:tool:answer", {
          answerId,
          answers,
        })) as boolean;
        if (!ok) {
          // Let AgentInteractionPanel show the inline error; no toast.
          return false;
        }
        return true;
      } catch (e) {
        error(e instanceof Error ? e.message : "提交回答失败");
        return false;
      } finally {
        setSubmittingApprovalId(null);
      }
    },
    [],
  );

  const handleApproveTool = useCallback(
    (approvalId: string) => {
      return respondToolApproval(approvalId, true);
    },
    [respondToolApproval],
  );

  const handleDenyTool = useCallback(
    (approvalId: string) => {
      return respondToolApproval(approvalId, false);
    },
    [respondToolApproval],
  );

  // "始终允许"语义：批准当前所有 awaiting_approval 的工具 + 本次请求后续自动通过
  // + 切换全局 full-auto 模式（onSwitchToFullAuto 回调）。
  // _originApprovalId 是触发此操作的卡片 id，但批量批准所有待审工具是"始终允许"
  // 的预期行为（而非仅批准单个），因此该参数被有意忽略。
  // 不处理 awaiting_input：问答卡必须由用户明确作答。
  //
  // 先走 bypass（主进程会按 requestId/topicId 放行所有已挂起的审批），
  // 再补发 UI 已知的 approve — 避免并行工具仍停在「准备中」却已在等审批的竞态。
  const handleAlwaysAllowTool = useCallback(
    async (_originApprovalId: string) => {
      const calls: Promise<unknown>[] = [];
      const requestId = requestIdRef.current;
      if (requestId) {
        calls.push(api.invoke("agent:tool:bypass_approval", { requestId }));
      }
      const topicId = topicIdRef?.current;
      if (topicId) {
        calls.push(api.invoke("ai:tool:bypass_approval", { topicId }));
      }

      const pendingIds = chatMessagesRef.current
        .filter(
          (m) =>
            m.type === "tool" &&
            m.toolStatus === "awaiting_approval" &&
            m.toolApprovalId &&
            // Force cards (cross-host grants, ssh_hosts writes) demand an
            // explicit per-card decision — never bulk-approved.
            !m.toolForce,
        )
        .map((m) => m.toolApprovalId!)
        .filter(Boolean);

      for (const id of pendingIds) {
        calls.push(api.invoke("agent:tool:approve", {
          approvalId: id,
          approved: true,
        }));
      }

      // Keep the mode change bound to the session that initiated the action.
      onSwitchToFullAuto();
      const results = await Promise.allSettled(calls);
      if (results.some((result) => result.status === "rejected")) {
        // Let AgentInteractionPanel show the inline error; no toast.
        return false;
      }
      return true;
    },
    [chatMessagesRef, requestIdRef, topicIdRef, onSwitchToFullAuto],
  );

  return {
    submittingApprovalId,
    respondToolApproval,
    submitToolAnswer,
    handleApproveTool,
    handleDenyTool,
    handleAlwaysAllowTool,
  };
}
