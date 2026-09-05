import { useEffect, useMemo, useState } from "react";
import { FieldHead } from "../../HintTip";
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

  const providerItems = useMemo(
    () => getSelectableModelItems(settings),
    [settings],
  );
  const providerOptions = settings.providers.filter((p) => p.enabled);

  const exactCompound =
    agent.providerId && agent.modelName
      ? `${agent.providerId}::${agent.modelName}`
      : "";
  const selectionValid =
    Boolean(exactCompound) &&
    providerItems.some((i) => i.value === exactCompound);
  const compound = selectionValid
    ? exactCompound
    : (providerItems[0]?.value ?? "");

  const selectedItem = providerItems.find((i) => i.value === compound);
  const selectedProvider =
    providerOptions.find((p) => p.id === selectedItem?.providerId) ||
    providerOptions.find((p) => p.id === agent.providerId) ||
    providerOptions[0];
  const modelsForProvider = selectedProvider?.models ?? [];

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
      <div className="agent-identity">
        <div className="agent-identity-portrait">
          <span className="agent-avatar-preview" aria-hidden>
            {imageAvatar && avatarSrc ? (
              <img src={avatarSrc} alt="" />
            ) : (
              DEFAULT_AGENT_AVATAR
            )}
          </span>
          <button
            type="button"
            className="btn-ghost agent-avatar-upload"
            onClick={() => void selectAvatarImage()}
          >
            更换头像
          </button>
        </div>

        <div className="agent-identity-fields">
          <div className="field">
            <FieldHead htmlFor="agent-name">名称</FieldHead>
            <input
              id="agent-name"
              type="text"
              value={agent.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="个人助手"
            />
          </div>

          <div className="field">
            <FieldHead htmlFor="agent-desc">描述</FieldHead>
            <textarea
              id="agent-desc"
              rows={2}
              value={agent.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="简短描述智能体的用途"
            />
          </div>
        </div>
      </div>

      <div className="field agent-backend-field">
        <FieldHead hint="智能体对话与工具循环使用的模型。需先在「AI 模型」页配置 Provider。">
          后端模型
        </FieldHead>
        {providerItems.length === 0 ? (
          <p className="field-hint field-hint--after warn">
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
        {!selectionValid && providerItems.length > 0 ? (
          <p className="field-hint field-hint--after warn">
            当前后端模型已失效
            {agent.modelName ? `（${agent.modelName}）` : ""}
            ，请重新选择。
          </p>
        ) : selectedProvider && modelsForProvider.length === 0 ? (
          <p className="field-hint field-hint--after warn">
            该 Provider 尚未配置模型。
          </p>
        ) : null}
      </div>
    </section>
  );
}
