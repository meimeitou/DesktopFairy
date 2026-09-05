import { useState } from "react";
import { FieldHead } from "../HintTip";
import {
  MODEL_KIND_LABELS,
  type CuratedModelKind,
} from "../../shared/modelKind";

interface Props {
  providerName: string;
  onClose: () => void;
  onConfirm: (modelId: string, kind: CuratedModelKind) => void;
}

export default function AddModelModal({ providerName, onClose, onConfirm }: Props) {
  const [modelId, setModelId] = useState("");
  const [kind, setKind] = useState<CuratedModelKind>("chat");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = modelId.trim();
    if (!id) return;
    onConfirm(id, kind);
  };

  return (
    <div className="provider-modal-overlay" onClick={onClose}>
      <form
        className="provider-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h4>添加模型</h4>
        <div className="field">
          <FieldHead
            htmlFor="add-model-id"
            hint={`为「${providerName}」填写模型 ID，并指定对话 / Embedding / Rerank。`}
          >
            模型 ID
          </FieldHead>
          <input
            id="add-model-id"
            type="text"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="gpt-4o-mini / text-embedding-3-small"
            autoFocus
          />
        </div>
        <div className="field">
          <label>类型</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as CuratedModelKind)}
          >
            <option value="chat">{MODEL_KIND_LABELS.chat}</option>
            <option value="embedding">{MODEL_KIND_LABELS.embedding}</option>
            <option value="rerank">{MODEL_KIND_LABELS.rerank}</option>
          </select>
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
