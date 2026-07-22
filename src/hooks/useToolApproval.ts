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
          alert("审批请求已失效，可能任务已结束。");
        }
      } catch (e) {
        alert(e instanceof Error ? e.message : "审批失败");
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
          alert("提问已失效，可能任务已结束。");
          return false;
        }
        return true;
      } catch (e) {
        alert(e instanceof Error ? e.message : "提交回答失败");
        return false;
      } finally {
        setSubmittingApprovalId(null);
      }
    },
    [],
  );

  const handleApproveTool = useCallback(
    (approvalId: string) => {
      void respondToolApproval(approvalId, true);
    },
    [respondToolApproval],
  );

  const handleDenyTool = useCallback(
    (approvalId: string) => {
      void respondToolApproval(approvalId, false);
    },
    [respondToolApproval],
  );

  // "始终允许"语义：批准当前所有 awaiting_approval 的工具 + 本次请求后续自动通过
  // + 切换全局 full-auto 模式（onSwitchToFullAuto 回调）。
  // _originApprovalId 是触发此操作的卡片 id，但批量批准所有待审工具是"始终允许"
  // 的预期行为（而非仅批准单个），因此该参数被有意忽略。
  // 不处理 awaiting_input：问答卡必须由用户明确作答。
  const handleAlwaysAllowTool = useCallback(
    (_originApprovalId: string) => {
      const pendingIds = chatMessagesRef.current
        .filter(
          (m) =>
            m.type === "tool" &&
            m.toolStatus === "awaiting_approval" &&
            m.toolApprovalId,
        )
        .map((m) => m.toolApprovalId!)
        .filter(Boolean);

      for (const id of pendingIds) {
        void api.invoke("agent:tool:approve", {
          approvalId: id,
          approved: true,
        });
      }

      const requestId = requestIdRef.current;
      if (requestId) {
        void api.invoke("agent:tool:bypass_approval", { requestId });
      }
      const topicId = topicIdRef?.current;
      if (topicId) {
        void api.invoke("ai:tool:bypass_approval", { topicId });
      }

      onSwitchToFullAuto();
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
