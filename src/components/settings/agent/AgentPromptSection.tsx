import type { AgentConfig } from "../../../shared/agent";

interface Props {
  agent: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
}

export default function AgentPromptSection({ agent, onChange }: Props) {
  return (
    <section className="settings-section agent-subsection">
      <h4>提示词设置</h4>
      <p className="field-hint">
        系统提示词（Instructions），智能体模式下注入每次对话，指导角色与行为。
      </p>
      <div className="field">
        <label>系统提示词</label>
        <textarea
          className="persona-textarea"
          rows={12}
          value={agent.instructions}
          onChange={(e) => onChange({ instructions: e.target.value })}
          placeholder="你是一位能帮忙干活的桌面伙伴…"
        />
      </div>
    </section>
  );
}
