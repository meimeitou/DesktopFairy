import { FieldHead } from "../../HintTip";
import RadioGroup from "../../RadioGroup";
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

const APPROVAL_MODES: { value: ToolApprovalMode; label: string }[] = [
  { value: "confirm", label: "每次确认" },
  { value: "auto", label: "自动批准" },
];

export default function AgentAdvancedSection({ agent, onChange }: Props) {
  return (
    <section className="settings-section agent-subsection">
      <div className="field">
        <FieldHead hint="每次确认：执行工具前弹出审批。自动批准：跳过确认直接执行，仅建议在可信环境使用。">
          工具审批
        </FieldHead>
        <RadioGroup
          name="toolApprovalMode"
          ariaLabel="工具审批模式"
          layout="inline"
          value={agent.toolApprovalMode}
          options={APPROVAL_MODES}
          onChange={(toolApprovalMode) => onChange({ toolApprovalMode })}
        />
      </div>

      <div className="field">
        <FieldHead
          htmlFor="agent-max-turns"
          hint="单次用户消息内，模型调用工具的最大循环次数。"
        >
          最大工具轮次
        </FieldHead>
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
          <span className="field-number-suffix">次</span>
        </div>
      </div>

      <div className="field">
        <FieldHead
          htmlFor="agent-env-vars"
          hint="传给 Shell 等子进程。每行一个 KEY=VALUE，以 # 开头的行视为注释。"
        >
          环境变量
        </FieldHead>
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
      </div>
    </section>
  );
}
