import { Button } from "animal-island-ui";
import { useState } from "react";
import type { AppSettings } from "../../../shared/settings";
import type { AgentConfig } from "../../../shared/agent";
import McpServersPanel from "./mcp/McpServersPanel";
import SkillsPanel from "./skills/SkillsPanel";

type ToolsSection = "mcp" | "skills";

const SECTIONS: { id: ToolsSection; label: string }[] = [
  { id: "mcp", label: "MCP 服务器" },
  { id: "skills", label: "技能" },
];

interface Props {
  settings: AppSettings;
  onChange: (fn: (prev: AppSettings) => AppSettings) => void;
}

export default function ToolsSettingsSection({ settings, onChange }: Props) {
  const [section, setSection] = useState<ToolsSection>("mcp");

  const updateAgent = (patch: Partial<AgentConfig>) => {
    onChange((prev) => ({
      ...prev,
      agent: { ...prev.agent, ...patch },
    }));
  };

  return (
    <div className="agent-settings">
      <nav className="agent-section-nav" aria-label="工具配置分区">
        {SECTIONS.map((item) => (
          <Button
            key={item.id}
            type="text"
            className={`agent-section-nav-item${section === item.id ? " active" : ""}`}
            aria-current={section === item.id ? "page" : undefined}
            onClick={() => setSection(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </nav>

      <div className="agent-section-body" key={section}>
        {section === "mcp" ? (
          <McpServersPanel settings={settings} onAgentChange={updateAgent} />
        ) : (
          <SkillsPanel settings={settings} onAgentChange={updateAgent} />
        )}
      </div>
    </div>
  );
}
