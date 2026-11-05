import { Input } from "@cherrystudio/ui";
import { FieldHead } from "../../HintTip";

import type { AgentConfig } from "../../../shared/agent";

interface Props {
  agent: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
  children?: React.ReactNode;
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

export default function AgentAdvancedSection({ agent, onChange, children }: Props) {
  return (
    <section className="settings-section agent-subsection">
      <div className="field">
        <FieldHead
          htmlFor="agent-max-turns"
          hint="单次用户消息内，模型调用工具的最大循环次数。"
        >
          最大工具轮次
        </FieldHead>
        <div className="field-number-row">
          <Input id="agent-max-turns" type="number" min={1} max={100} value={agent.maxTurns} onChange={(e) =>
            onChange({ maxTurns: Math.max(1, Number(e.target.value) || 30) })
          } />
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
      {children}
    </section>
  );
}
