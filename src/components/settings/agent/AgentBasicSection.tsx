import { useEffect, useState } from "react";
import ModelSelector from "../../ModelSelector";
import type { AppSettings } from "../../../shared/settings";
import { getSelectableModelItems } from "../../../shared/settings";
import type { AgentConfig } from "../../../shared/agent";
import {
  DEFAULT_AGENT_AVATAR,
  isImageAvatar,
} from "../../../shared/agentAvatar";

const api = window.electronAPI;

interface Props {
  settings: AppSettings;
  agent: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
}

export default function AgentBasicSection({
  settings,
  agent,
  onChange,
}: Props) {
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const imageAvatar = isImageAvatar(agent.avatar);
  const providerItems = getSelectableModelItems(settings);
  const providerOptions = settings.providers.filter((p) => p.enabled);
  const selectedProvider =
    providerOptions.find((p) => p.id === agent.providerId) ||
    providerOptions[0];
  const modelsForProvider = selectedProvider?.models ?? [];
  const compound =
    selectedProvider && agent.modelName
      ? `${selectedProvider.id}::${agent.modelName}`
      : (providerItems[0]?.value ?? "");

  const providerLabels = Object.fromEntries(
    providerOptions.map((p) => [p.id, p.name]),
  );

  useEffect(() => {
    if (!imageAvatar) return;
    let cancelled = false;
    void (async () => {
      try {
        const resolved = (await api.invoke(
          "agent:avatar:resolve",
          agent.avatar,
        )) as string | null;
        if (!cancelled) setAvatarSrc(resolved);
      } catch {
        if (!cancelled) setAvatarSrc(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agent.avatar, imageAvatar]);

  const handleModelCompound = (value: string) => {
    const sep = value.indexOf("::");
    if (sep === -1) return;
    onChange({
      providerId: value.slice(0, sep),
      modelName: value.slice(sep + 2),
    });
  };

  const selectAvatarImage = async () => {
    try {
      const packed = (await api.invoke("agent:avatar:select")) as string | null;
      if (packed) onChange({ avatar: packed });
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="settings-section agent-subsection">
      <h4>基础设置</h4>
      <p className="agent-subsection-intro">
        名称、头像与后端模型。智能体模式使用此处配置的 Provider。
      </p>

      <div className="field field-row">
        <label>启用智能体</label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={agent.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
          />
          <span className="toggle-track" />
        </label>
      </div>

      <div className="field">
        <label>头像</label>
        <div className="agent-avatar-row">
          <span className="agent-avatar-preview" aria-hidden>
            {imageAvatar && avatarSrc ? (
              <img src={avatarSrc} alt="" />
            ) : (
              DEFAULT_AGENT_AVATAR
            )}
          </span>
          <button
            type="button"
            className="btn-secondary agent-avatar-upload"
            onClick={() => void selectAvatarImage()}
          >
            上传图片
          </button>
        </div>
      </div>

      <div className="field">
        <label>名称</label>
        <input
          type="text"
          value={agent.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="个人助手"
        />
      </div>

      <div className="field">
        <label>描述</label>
        <textarea
          rows={2}
          value={agent.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="简短描述智能体的用途"
        />
      </div>

      <div className="field">
        <label>后端模型</label>
        <p className="field-hint">
          智能体对话与工具循环使用的模型（需在 AI 模型页配置 Provider）。
        </p>
        {providerItems.length === 0 ? (
          <p className="field-hint warn">
            请先在「AI 模型」中启用并配置 Provider。
          </p>
        ) : (
          <ModelSelector
            models={providerItems.map((i) => i.value)}
            value={compound}
            onChange={handleModelCompound}
            allowCustom={false}
            modelLabels={Object.fromEntries(
              providerItems.map((i) => [i.value, i.label]),
            )}
          />
        )}
        {selectedProvider && (
          <p className="field-hint">
            当前：{providerLabels[selectedProvider.id] || selectedProvider.id}
            {modelsForProvider.length === 0 ? "（未配置模型）" : ""}
          </p>
        )}
      </div>
    </section>
  );
}
