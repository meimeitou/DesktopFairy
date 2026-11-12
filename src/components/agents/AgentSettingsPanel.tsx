import { Button } from "@cherrystudio/ui";
import {
  Book,
  Folder,
  Lightbulb,
  Settings,
  Share2,
  Star,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

import { useState } from "react";
import { useSettings } from "../../shared/settingsStore";
import type { AgentConfig } from "../../shared/agent";
import AgentAvatar from "../AgentAvatar";
import type { AgentConfigSection } from "../../shared/agentSettingsSections";
import { AGENT_CONFIG_SECTIONS } from "../../shared/agentSettingsSections";
import { CHAT_MODE_CARDS, type ChatMode } from "../../shared/chatMode";
import { FieldHead } from "../HintTip";
import AgentKnowledgeField from "./AgentKnowledgeField";
import AgentBasicSection from "../settings/agent/AgentBasicSection";
import AgentPromptSection from "../settings/agent/AgentPromptSection";
import AgentToolsSection from "../settings/agent/AgentToolsSection";
import AgentSkillsSection from "../settings/agent/AgentSkillsSection";
import AgentAdvancedSection from "../settings/agent/AgentAdvancedSection";
// 各分区复用了设置页的表单样式（.field / .settings-section / .agent-*）。
// 这些规则原本只在设置页加载，面板在终端设置里打开时会全部丢失。
import "../../pages/SettingsPage.css";
import "./AgentSettingsModal.css";

const sectionIcons: Record<AgentConfigSection, LucideIcon> = {
  basic: User,
  prompt: Book,
  builtin: Settings,
  mcp: Share2,
  skills: Star,
  knowledge: Folder,
  advanced: Lightbulb,
};

export default function AgentSettingsPanel({
  agent,
  onChange,
  onClose,
}: {
  agent: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
  /** 传了才渲染右上角关闭按钮 */
  onClose?: () => void;
}) {
  const settings = useSettings();
  const [section, setSection] = useState<AgentConfigSection>("basic");

  const isTerminal = agent.id === settings.terminalAgentId;
  const builtinLabel =
    agent.builtinRole === "personal-assistant"
      ? "内置 · 个人助手"
      : agent.builtinRole === "terminal-assistant"
        ? "内置 · 终端助手"
        : undefined;

  const sections = AGENT_CONFIG_SECTIONS;
  const activeSection = sections.some((item) => item.id === section)
    ? section
    : sections[0].id;

  const renderSection = () => {
    switch (activeSection) {
      case "basic":
        return (
          <AgentBasicSection settings={settings} agent={agent} onChange={onChange} />
        );
      case "prompt":
        return <AgentPromptSection agent={agent} onChange={onChange} isTerminal={isTerminal} />;
      case "builtin":
        return (
          <AgentToolsSection
            panel="builtin"
            agent={agent}
            onAgentChange={onChange}
            context={
              isTerminal || agent.builtinRole === "terminal-assistant"
                ? "terminal"
                : agent.builtinRole === "host-assistant"
                ? "host"
                : "local"
            }
          />
        );
      case "mcp":
        return (
          <AgentToolsSection panel="mcp" agent={agent} onAgentChange={onChange} />
        );
      case "skills":
        return <AgentSkillsSection agent={agent} onChange={onChange} />;
      case "knowledge":
        return (
          <AgentKnowledgeField
            selectedIds={agent.knowledgeBaseIds}
            onChange={(ids) => onChange({ knowledgeBaseIds: ids })}
          />
        );
      case "advanced":
        return (
          <AgentAdvancedSection agent={agent} onChange={onChange}>
            <div className="field">
              <FieldHead
                htmlFor="agent-default-chat-mode"
                hint="该智能体新建会话时使用的默认对话模式；每个会话可单独切换。"
              >
                默认对话模式
              </FieldHead>
              <div className="agent-chatmode-cards">
                {CHAT_MODE_CARDS.map((card) => (
                  <button
                    key={card.mode}
                    type="button"
                    className={`agent-chatmode-card${agent.chatMode === card.mode ? " active" : ""}`}
                    onClick={() => onChange({ chatMode: card.mode as ChatMode })}
                  >
                    <strong>{card.title}</strong>
                    <span>{card.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </AgentAdvancedSection>
        );
      default:
        return null;
    }
  };

  return (
    <div className="agent-settings-panel">
      <header className="agent-settings-modal-head">
        <AgentAvatar avatar={agent.avatar} className="agent-avatar-preview" />
        <div className="agent-settings-modal-head-main">
          <strong>{agent.name || "未命名智能体"}</strong>
          {builtinLabel && (
            <span className="agent-tool-auto-badge">{builtinLabel}</span>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" onClick={onClose} aria-label="关闭">
            <X size={16} />
          </Button>
        )}
      </header>

      <div className="agent-settings-modal-columns">
        <nav className="agent-settings-nav" aria-label="智能体配置分区">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`agent-settings-nav-item${activeSection === item.id ? " active" : ""}`}
              aria-current={activeSection === item.id ? "page" : undefined}
              onClick={() => setSection(item.id)}
            >
              <span className="agent-settings-nav-icon">
                {(() => {
                  const SectionIcon = sectionIcons[item.id];
                  return <SectionIcon size={16} />;
                })()}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="agent-settings-body" key={`${agent.id}-${activeSection}`}>
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
