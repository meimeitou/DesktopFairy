import { useCallback, useState, type MutableRefObject } from "react";
import type { ChatMsg } from "../shared/chatMessages";

const api = window.electronAPI;

export function useToolApproval(
  chatMessagesRef: MutableRefObject<ChatMsg[]>,
  onSwitchToFullAuto: () => void,
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

  const handleAlwaysAllowTool = useCallback(
    (_approvalId: string) => {
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

      onSwitchToFullAuto();
    },
    [chatMessagesRef, onSwitchToFullAuto],
  );

  return {
    submittingApprovalId,
    respondToolApproval,
    handleApproveTool,
    handleDenyTool,
    handleAlwaysAllowTool,
  };
}
