import { findAgentById, type AgentConfig } from "../../shared/agent";
import { updateAgentInSettings } from "../../shared/settings";
import { setSettings, useSettings } from "../../shared/settingsStore";
import AgentSettingsPanel from "../agents/AgentSettingsPanel";

export default function TerminalAiSettingsSection() {
  const settings = useSettings();

  const agent = findAgentById(settings.agents, settings.terminalAgentId);

  const handleChange = (patch: Partial<AgentConfig>) => {
    if (!agent) return;
    setSettings((prev) => updateAgentInSettings(prev, agent.id, patch));
  };

  return (
    <section className="settings-section terminal-ai-section">
      {agent ? (
        <AgentSettingsPanel agent={agent} onChange={handleChange} />
      ) : (
        <p className="terminal-ai-missing">该智能体不存在</p>
      )}
    </section>
  );
}