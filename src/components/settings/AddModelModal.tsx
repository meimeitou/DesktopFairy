import { useState } from "react";

interface Props {
  providerName: string;
  onClose: () => void;
  onConfirm: (modelId: string) => void;
}

export default function AddModelModal({ providerName, onClose, onConfirm }: Props) {
  const [modelId, setModelId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelId.trim()) return;
    onConfirm(modelId.trim());
  };

  return (
    <div className="provider-modal-overlay" onClick={onClose}>
      <form
        className="provider-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h4>添加模型</h4>
        <p className="provider-modal-desc">
          为「{providerName}」手动添加模型 ID（多个可用逗号分隔）
        </p>
        <div className="field">
          <label>模型 ID</label>
          <input
            type="text"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="gpt-4o-mini / llama3.2"
            autoFocus
          />
        </div>
        <div className="provider-modal-footer">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button type="submit" disabled={!modelId.trim()}>
            添加
          </button>
        </div>
      </form>
    </div>
  );
}
