import { Button } from "animal-island-ui";
import { useState } from "react";
import type { AppSettings } from "../../../shared/settings";
import McpServersPanel from "./mcp/McpServersPanel";
import SkillsPanel from "./skills/SkillsPanel";

type ToolsSection = "mcp" | "skills";

const SECTIONS: { id: ToolsSection; label: string }[] = [
  { id: "mcp", label: "MCP 服务器" },
  { id: "skills", label: "技能" },
];

interface Props {
  settings: AppSettings;
}

export default function ToolsSettingsSection({ settings }: Props) {
  const [section, setSection] = useState<ToolsSection>("mcp");

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
          <McpServersPanel settings={settings} />
        ) : (
          <SkillsPanel settings={settings} />
        )}
      </div>
    </div>
  );
}
