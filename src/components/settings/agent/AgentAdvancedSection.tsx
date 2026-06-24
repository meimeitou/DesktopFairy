import type { AgentConfig } from "../../../shared/agent";

interface Props {
  agent: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
}

function envVarsToText(envVars: Record<string, string>): string {
  return Object.entries(envVars)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
}

function parseEnvVarsText(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

export default function AgentAdvancedSection({ agent, onChange }: Props) {
  return (
    <section className="settings-section agent-subsection">
      <h4>高级设置</h4>
      <p className="field-hint">
        控制工具循环与审批策略。
      </p>

      <div className="field">
        <label>最大工具轮次</label>
        <input
          type="number"
          min={1}
          max={100}
          value={agent.maxTurns}
          onChange={(e) =>
            onChange({ maxTurns: Math.max(1, Number(e.target.value) || 30) })
          }
        />
        <p className="field-hint">单次用户消息内，模型调用工具的最大循环次数。</p>
      </div>

      <div className="field">
        <label>环境变量</label>
        <textarea
          rows={5}
          defaultValue={envVarsToText(agent.envVars)}
          key={JSON.stringify(agent.envVars)}
          onBlur={(e) =>
            onChange({ envVars: parseEnvVarsText(e.target.value) })
          }
          placeholder={"KEY=value\nANOTHER=value"}
        />
        <p className="field-hint">Shell 工具执行时合并进子进程环境（KEY=VALUE 每行一个）。</p>
      </div>
    </section>
  );
}
