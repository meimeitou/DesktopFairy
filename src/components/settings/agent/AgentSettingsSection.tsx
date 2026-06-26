import { useState } from "react";
import type { AppSettings } from "../../../shared/settings";
import type { AgentConfig } from "../../../shared/agent";
import type { AgentConfigSection } from "../../../shared/agentSettingsSections";
import { AGENT_CONFIG_SECTIONS } from "../../../shared/agentSettingsSections";
import AgentBasicSection from "./AgentBasicSection";
import AgentPromptSection from "./AgentPromptSection";
import AgentToolsSection from "./AgentToolsSection";
import AgentAdvancedSection from "./AgentAdvancedSection";

interface Props {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

export default function AgentSettingsSection({ settings, onChange }: Props) {
  const [section, setSection] = useState<AgentConfigSection>("basic");
  const agent = settings.agent;

  const updateAgent = (patch: Partial<AgentConfig>) => {
    onChange({ agent: { ...settings.agent, ...patch } });
  };

  const renderSection = () => {
    switch (section) {
      case "basic":
        return (
          <AgentBasicSection
            settings={settings}
            agent={agent}
            onChange={updateAgent}
          />
        );
      case "prompt":
        return <AgentPromptSection agent={agent} onChange={updateAgent} />;
      case "tools":
        return (
          <AgentToolsSection agent={agent} onAgentChange={updateAgent} />
        );
      case "advanced":
        return <AgentAdvancedSection agent={agent} onChange={updateAgent} />;
      default:
        return null;
    }
  };

  return (
    <div className="agent-settings">
      <div className="agent-settings-header">
        <h3>智能体配置</h3>
        <p className="agent-settings-desc">
          配置名称、提示词、工具与运行策略。更改会即时保存。
        </p>
      </div>

      <nav className="agent-section-nav" aria-label="智能体配置分区">
        {AGENT_CONFIG_SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`agent-section-nav-item${section === item.id ? " active" : ""}`}
            onClick={() => setSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="agent-section-body" key={section}>{renderSection()}</div>
    </div>
  );
}
