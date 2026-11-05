import { Button } from "@cherrystudio/ui";

import type { AgentConfig } from "../../shared/agent";

interface Props {
  agent?: AgentConfig;
  /** 锚点（视口坐标）：菜单在锚点右侧展开 */
  x: number;
  y: number;
  onEdit: (agentId: string) => void;
  onDuplicate: (agent: AgentConfig) => void;
  onRequestDelete: (agentId: string) => void;
}

export default function AgentContextMenu({
  agent,
  x,
  y,
  onEdit,
  onDuplicate,
  onRequestDelete,
}: Props) {
  if (!agent) return null;
  // 终端助手被终端页全局绑定，不可删除；其余（含内置个人助手）可删。
  const isTerminal = agent.builtinRole === "terminal-assistant";
  return (
    <div className="agent-context-menu" style={{ left: x, top: y }}>
      <Button variant="ghost" size="sm" onClick={() => onEdit(agent.id)}>
        编辑
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onDuplicate(agent)}>
        复制
      </Button>
      <Button variant="ghost" size="sm" className="agent-menu-delete-btn" disabled={isTerminal} title={isTerminal ? "终端页依赖此智能体，不可删除" : undefined} onClick={() => {
          if (!isTerminal) onRequestDelete(agent.id);
        }}>
        删除
      </Button>
    </div>
  );
}
