import { useState } from "react";
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
          <label>名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：DeepSeek、本地 Ollama"
            autoFocus
          />
        </div>
        <div className="field">
          <label>类型</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ProviderType)}
          >
            <option value="openai">OpenAI 兼容 API</option>
            <option value="openai-response">OpenAI Responses API</option>
            <option value="anthropic">Anthropic Messages API</option>
            <option value="ollama">Ollama</option>
          </select>
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
