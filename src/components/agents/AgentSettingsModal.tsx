import { Button, Icon, Modal, type IconName } from "animal-island-ui";
import { useEffect, useMemo, useState } from "react";
import { useSettings, setSettings } from "../../shared/settingsStore";
import type { AppSettings } from "../../shared/settings";
import { updateAgentInSettings, appendAgentToSettings } from "../../shared/settings";
import {
  createPersonalAssistantDefaults,
  NEW_AGENT_SOUL_TEMPLATE,
  PERSONAL_DEFAULT_DISABLED_TOOL_IDS,
  PERSONAL_ASSISTANT_ID,
  type AgentConfig,
} from "../../shared/agent";
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
import "./AgentSettingsModal.css";

interface Props {
  open: boolean;
  /** Edit an existing agent. */
  agentId: string | null;
  /** Create mode: creates on first patch. */
  creating?: { name?: string };
  onClose: () => void;
}

function newAgentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function AgentSettingsModal({
  open,
  agentId,
  creating,
  onClose,
}: Props) {
  const settings = useSettings();
  const [section, setSection] = useState<AgentConfigSection>("basic");
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Reset create-session state when the modal closes.
  useEffect(() => {
    if (!open) setCreatedId(null);
  }, [open]);

  // Resolve target: existing agent, or a draft pending creation.
  // In create mode, once the first patch materializes the agent, createdId
  // keeps subsequent patches updating that same agent instead of appending
  // a new one per keystroke.
  const existing = useMemo(
    () =>
      settings.agents.find((a) => a.id === (agentId ?? createdId)) ?? null,
    [settings.agents, agentId, createdId],
  );
  const creatingAgent = !existing && !!creating && open;
  const draftName = creating?.name?.trim() || "新智能体";

  // For create mode: derive from the personal assistant's current model.
  const personal = settings.agents.find(
    (a) => a.id === PERSONAL_ASSISTANT_ID,
  );
  const draft = useMemo<AgentConfig | null>(() => {
    if (!creatingAgent) return null;
    return createPersonalAssistantDefaults({
      id: "",
      builtinRole: undefined,
      name: draftName,
      avatar: "🤖",
      description: "",
      soul: NEW_AGENT_SOUL_TEMPLATE,
      providerId: personal?.providerId ?? "openai",
      modelName: personal?.modelName ?? "gpt-4o-mini",
      disabledToolIds: PERSONAL_DEFAULT_DISABLED_TOOL_IDS,
    });
  }, [creatingAgent, draftName, personal?.providerId, personal?.modelName]);

  const agent = existing ?? draft;
  const updateAgent = (patch: Partial<AgentConfig>) => {
    if (existing) {
      setSettings((prev) => updateAgentInSettings(prev, existing.id, patch));
      return;
    }
    if (!draft) return;
    const id = newAgentId();
    setCreatedId(id);
    // Materialize with the patch applied so nothing is lost.
    setSettings((prev) =>
      appendAgentToSettings(prev, { ...draft, id, ...patch }),
    );
  };

  if (!open || !agent) return null;

  const isTerminal = agent.id === settings.terminalAgentId;
  const isHost = agent.builtinRole === "host-assistant";
  const isBuiltin = Boolean(agent.builtinRole);
  const builtinLabel =
    agent.builtinRole === "personal-assistant"
      ? "内置 · 个人助手"
      : agent.builtinRole === "terminal-assistant"
        ? "内置 · 终端助手"
        : agent.builtinRole === "host-assistant"
          ? "内置 · 主机助手"
          : undefined;

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
      case "builtin":
        return (
          <AgentToolsSection
            panel="builtin"
            agent={agent}
            onAgentChange={updateAgent}
            context={isHost ? "host" : isTerminal ? "terminal" : "local"}
          />
        );
      case "mcp":
        return (
          <AgentToolsSection
            panel="mcp"
            agent={agent}
            onAgentChange={updateAgent}
          />
        );
      case "skills":
        return <AgentSkillsSection agent={agent} onChange={updateAgent} />;
      case "knowledge":
        return (
          <AgentKnowledgeField
            selectedIds={agent.knowledgeBaseIds}
            onChange={(ids) => updateAgent({ knowledgeBaseIds: ids })}
          />
        );
      case "advanced":
        return (
          <AgentAdvancedSection agent={agent} onChange={updateAgent}>
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
                    onClick={() => updateAgent({ chatMode: card.mode as ChatMode })}
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

  const sectionIcons: Record<AgentConfigSection, IconName> = {
    basic: "User",
    prompt: "Book",
    builtin: "Settings",
    mcp: "Share",
    skills: "Star",
    knowledge: "Folder",
    advanced: "Bulb",
  };

  return (
    <Modal
      open={open}
      title="智能体设置"
      onClose={onClose}
      width={860}
      className="agent-settings-modal"
      footer={null}
      typewriter={false}
    >
      <div className="agent-settings-modal-body">
        <header className="agent-settings-modal-head">
          <AgentAvatar
            avatar={agent.avatar}
            className="agent-avatar-preview"
          />
          <div className="agent-settings-modal-head-main">
            <strong>{agent.name || "未命名智能体"}</strong>
            {builtinLabel && (
              <span className="agent-tool-auto-badge">{builtinLabel}</span>
            )}
          </div>
          <Button type="text" onClick={onClose} aria-label="关闭">
            <Icon name="Close" size={16} />
          </Button>
        </header>
        <div className="agent-settings-modal-columns">
          <nav className="agent-settings-nav" aria-label="智能体配置分区">
            {AGENT_CONFIG_SECTIONS.filter((item) => !(isHost && item.id === "mcp")).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`agent-settings-nav-item${section === item.id ? " active" : ""}`}
                aria-current={section === item.id ? "page" : undefined}
                onClick={() => setSection(item.id)}
              >
                <span className="agent-settings-nav-icon">
                  <Icon name={sectionIcons[item.id]} size={16} />
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="agent-settings-body" key={`${agent.id}-${section}`}>
            {renderSection()}
          </div>
        </div>
      </div>
    </Modal>
  );
}
