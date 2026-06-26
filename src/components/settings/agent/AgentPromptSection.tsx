import { DEFAULT_SOUL, DEFAULT_USER_TEMPLATE, type AgentConfig } from "../../../shared/agent";

interface Props {
  agent: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
}

export default function AgentPromptSection({ agent, onChange }: Props) {
  const isDefaultSoul = agent.soul.trim() === DEFAULT_SOUL.trim();

  return (
    <section className="settings-section agent-subsection">
      <h4>提示词设置</h4>
      <p className="agent-subsection-intro">
        通过 <code>SOUL.md</code> 与 <code>USER.md</code> 定义智能体的人格与用户习惯，
        两者会在智能体模式下注入每次对话的系统提示词。
      </p>

      <div className="field">
        <label>SOUL.md — 智能体人格</label>
        <textarea
          rows={14}
          value={agent.soul}
          onChange={(e) => onChange({ soul: e.target.value })}
          placeholder="描述这个智能体的性格与行为准则…"
        />
        <p className="field-hint">
          记录当前智能体的用途、性格与执行规则——它"是谁"、"怎么做事"。
        </p>
        <div className="field-row">
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

      <div className="field">
        <label>USER.md — 用户习惯</label>
        <textarea
          rows={14}
          value={agent.user}
          onChange={(e) => onChange({ user: e.target.value })}
          placeholder={"# 用户档案\n\n- 称呼：\n- 时区：UTC+8\n- 偏好的沟通风格：\n- 常用工具："}
        />
        <p className="field-hint">
          记录你的身份、偏好与工作习惯——智能体据此个性化回复。留空则不注入。
        </p>
        <div className="field-row">
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
    </section>
  );
}
