import { FieldHead } from "../../HintTip";
import {
  DEFAULT_SOUL,
  DEFAULT_USER_TEMPLATE,
  type AgentConfig,
} from "../../../shared/agent";

interface Props {
  agent: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
}

export default function AgentPromptSection({ agent, onChange }: Props) {
  const isDefaultSoul = agent.soul.trim() === DEFAULT_SOUL.trim();

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
              <button
                type="button"
                className="btn-ghost"
                disabled={isDefaultSoul}
                onClick={() => onChange({ soul: DEFAULT_SOUL })}
              >
                恢复默认
              </button>
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
              hint="记录你的身份、偏好与工作习惯，智能体据此个性化回复。留空则不注入。"
            >
              USER.md
            </FieldHead>
            <div className="agent-manuscript-actions">
              <button
                type="button"
                className="btn-ghost"
                disabled={!!agent.user.trim()}
                onClick={() => onChange({ user: DEFAULT_USER_TEMPLATE })}
              >
                载入模板
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={!agent.user.trim()}
                onClick={() => onChange({ user: "" })}
              >
                清空
              </button>
            </div>
          </div>
          <textarea
            id="agent-user"
            className="agent-manuscript-body"
            rows={12}
            value={agent.user}
            onChange={(e) => onChange({ user: e.target.value })}
            placeholder={
              "# 用户档案\n\n- 称呼：\n- 时区：UTC+8\n- 偏好的沟通风格：\n- 常用工具："
            }
          />
        </div>
      </div>
    </section>
  );
}
