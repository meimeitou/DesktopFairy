import { Button } from "@cherrystudio/ui";

import { FieldHead } from "../../HintTip";
import {
  DEFAULT_SOUL,
  DEFAULT_TERMINAL_SOUL,
  DEFAULT_TERMINAL_USER_TEMPLATE,
  DEFAULT_USER_TEMPLATE,
  type AgentConfig,
} from "../../../shared/agent";

interface Props {
  agent: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
  isTerminal?: boolean;
}

export default function AgentPromptSection({ agent, onChange, isTerminal = agent.builtinRole === "terminal-assistant" }: Props) {
  const defaultSoul =
    isTerminal
      ? DEFAULT_TERMINAL_SOUL
      : DEFAULT_SOUL;
  const userTemplate = isTerminal ? DEFAULT_TERMINAL_USER_TEMPLATE : DEFAULT_USER_TEMPLATE;
  const isDefaultSoul = agent.soul.trim() === defaultSoul.trim();

  return (
    <section className="settings-section agent-subsection">
      <div className="agent-manuscript">
        <div className="agent-manuscript-block">
          <div className="agent-manuscript-spine">
            <FieldHead
              htmlFor="agent-soul"
              hint="写入系统提示词：用途、性格与执行规则——它是谁、怎么做事。"
            >
              SOUL.md
            </FieldHead>
            <div className="agent-manuscript-actions">
              <Button variant="outline" size="sm" disabled={isDefaultSoul} onClick={() => onChange({ soul: defaultSoul })}>
                恢复默认
              </Button>
            </div>
          </div>
          <textarea
            id="agent-soul"
            className="agent-manuscript-body"
            rows={12}
            value={agent.soul}
            onChange={(e) => onChange({ soul: e.target.value })}
            placeholder="描述这个智能体的性格与行为准则…"
          />
        </div>

        <div className="agent-manuscript-block">
          <div className="agent-manuscript-spine">
            <FieldHead
              htmlFor="agent-user"
              hint={isTerminal
                ? "记录已确认的长期沟通偏好、工作背景与运维习惯。当前主机和目录由会话提供，不填写凭据；留空则不注入。"
                : "记录你的身份、偏好与工作习惯，智能体据此个性化回复。留空则不注入。"}
            >
              USER.md
            </FieldHead>
            <div className="agent-manuscript-actions">
              <Button variant="outline" size="sm" disabled={!!agent.user.trim()} onClick={() => onChange({ user: userTemplate })}>
                载入模板
              </Button>
              <Button variant="outline" size="sm" disabled={!agent.user.trim()} onClick={() => onChange({ user: "" })}>
                清空
              </Button>
            </div>
          </div>
          <textarea
            id="agent-user"
            className="agent-manuscript-body"
            rows={12}
            value={agent.user}
            onChange={(e) => onChange({ user: e.target.value })}
            placeholder={
              isTerminal ? userTemplate : "# 用户档案\n\n- 称呼：\n- 时区：UTC+8\n- 偏好的沟通风格：\n- 常用工具："
            }
          />
        </div>
      </div>
    </section>
  );
}
