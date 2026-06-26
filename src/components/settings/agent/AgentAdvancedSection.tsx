import type { AgentConfig, ToolApprovalMode } from "../../../shared/agent";

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

const APPROVAL_MODES: {
  value: ToolApprovalMode;
  label: string;
  description: string;
}[] = [
  {
    value: "confirm",
    label: "每次确认",
    description: "执行工具前弹出审批，适合日常使用。",
  },
  {
    value: "auto",
    label: "自动批准",
    description: "跳过确认直接执行，仅建议在可信环境使用。",
  },
];

export default function AgentAdvancedSection({ agent, onChange }: Props) {
  return (
    <section className="settings-section agent-subsection">
      <h4>高级设置</h4>
      <p className="agent-subsection-intro">
        控制工具循环次数、审批策略与子进程环境变量。
      </p>

      <div className="agent-field-group">
        <div className="field">
          <label>工具审批</label>
          <div className="approval-mode-options" role="radiogroup" aria-label="工具审批模式">
            {APPROVAL_MODES.map((mode) => (
              <label key={mode.value} className="approval-mode-option">
                <input
                  type="radio"
                  name="toolApprovalMode"
                  value={mode.value}
                  checked={agent.toolApprovalMode === mode.value}
                  onChange={() => onChange({ toolApprovalMode: mode.value })}
                />
                <span className="approval-mode-option-body">
                  <strong>{mode.label}</strong>
                  <span>{mode.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="agent-field-group">
        <div className="field">
          <label htmlFor="agent-max-turns">最大工具轮次</label>
          <div className="field-number-row">
            <input
              id="agent-max-turns"
              type="number"
              min={1}
              max={100}
              value={agent.maxTurns}
              onChange={(e) =>
                onChange({ maxTurns: Math.max(1, Number(e.target.value) || 30) })
              }
            />
            <span className="field-number-suffix">次 · 范围 1–100</span>
          </div>
          <p className="field-hint field-hint--after">
            单次用户消息内，模型调用工具的最大循环次数。
          </p>
        </div>
      </div>

      <div className="agent-field-group">
        <div className="field">
          <label htmlFor="agent-env-vars">环境变量</label>
          <textarea
            id="agent-env-vars"
            className="field-textarea-mono"
            rows={6}
            defaultValue={envVarsToText(agent.envVars)}
            key={JSON.stringify(agent.envVars)}
            onBlur={(e) =>
              onChange({ envVars: parseEnvVarsText(e.target.value) })
            }
            placeholder={"# Shell 工具子进程环境\nKEY=value\nANOTHER=value"}
            spellCheck={false}
          />
          <p className="field-hint field-hint--after">
            每行一个 <code>KEY=VALUE</code>，以 <code>#</code> 开头的行视为注释。
          </p>
        </div>
      </div>
    </section>
  );
}
