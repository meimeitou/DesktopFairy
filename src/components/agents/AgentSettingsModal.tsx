import { Modal } from "animal-island-ui";
import { useEffect, useMemo, useState } from "react";
import { useSettings, setSettings } from "../../shared/settingsStore";
import { updateAgentInSettings, appendAgentToSettings } from "../../shared/settings";
import {
  createPersonalAssistantDefaults,
  NEW_AGENT_SOUL_TEMPLATE,
  PERSONAL_DEFAULT_DISABLED_TOOL_IDS,
  PERSONAL_ASSISTANT_ID,
  type AgentConfig,
} from "../../shared/agent";
import AgentSettingsPanel from "./AgentSettingsPanel";
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
        <AgentSettingsPanel agent={agent} onChange={updateAgent} onClose={onClose} />
      </div>
    </Modal>
  );
}