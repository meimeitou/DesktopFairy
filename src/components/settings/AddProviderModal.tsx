import { useState } from "react";
import { FieldHead } from "../HintTip";
import RadioGroup from "../RadioGroup";
import type { ProviderType } from "../../shared/providers";

interface Props {
  onClose: () => void;
  onConfirm: (name: string, type: ProviderType) => void;
}

export default function AddProviderModal({ onClose, onConfirm }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ProviderType>("openai");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim(), type);
  };

  return (
    <div className="provider-modal-overlay" onClick={onClose}>
      <form
        className="provider-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h4>添加服务商</h4>
        <div className="field">
          <FieldHead htmlFor="add-provider-name">名称</FieldHead>
          <input
            id="add-provider-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：DeepSeek、本地 Ollama"
            autoFocus
          />
        </div>
        <div className="field">
          <FieldHead hint="决定请求怎么拼、模型列表从哪拉。多数第三方选 OpenAI 兼容。">
            类型
          </FieldHead>
          <RadioGroup<ProviderType>
            name="providerType"
            ariaLabel="服务商类型"
            value={type}
            options={[
              { value: "openai", label: "OpenAI 兼容 API" },
              { value: "openai-response", label: "OpenAI Responses API" },
              { value: "anthropic", label: "Anthropic Messages API" },
              { value: "ollama", label: "Ollama" },
            ]}
            onChange={setType}
          />
        </div>
        <div className="provider-modal-footer">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button type="submit" disabled={!name.trim()}>
            添加
          </button>
        </div>
      </form>
    </div>
  );
}
