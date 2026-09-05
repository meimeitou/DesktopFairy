import { useMemo, useState } from "react";
import type { AppSettings } from "../../shared/settings";
import {
  listEmbeddingModelItems,
  getEmbeddingApiConfig,
} from "../../shared/settings";
import type { KnowledgeSettings } from "../../shared/knowledge";
import { clampInt, knowledgeSettingsConfigured } from "../../shared/knowledge";

const api = window.electronAPI;

interface Props {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

export default function KnowledgeSettingsSection({ settings, onChange }: Props) {
  const items = useMemo(() => listEmbeddingModelItems(settings), [settings]);
  const cfg = settings.knowledge;
  const compound = cfg.embeddingProviderId && cfg.embeddingModel
    ? `${cfg.embeddingProviderId}::${cfg.embeddingModel}`
    : "";
  const ready = Boolean(getEmbeddingApiConfig(settings));
  const [busy, setBusy] = useState(false);

  const update = (patch: Partial<KnowledgeSettings>) => {
    onChange({ knowledge: { ...cfg, ...patch } });
  };

  const applyRetrievalChange = async (patch: Partial<KnowledgeSettings>, rebuild: boolean) => {
    const next = { ...cfg, ...patch };
    if (rebuild && knowledgeSettingsConfigured(cfg)) {
      const ok = window.confirm(
        "将重建全部知识库索引（会再次消耗 MinerU 与 embedding 配额）。确定继续？",
      );
      if (!ok) return;
    }
    update(patch);
    if (!rebuild) return;
    if (!next.embeddingProviderId || !next.embeddingModel) return;
    setBusy(true);
    try {
      await api.invoke("knowledge:rebuild_all");
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="settings-section">
      <p className="field-hint">
        所有知识库共用同一套 embedding 与分块参数。
      </p>
      {!ready && (
        <p className="field-hint" style={{ color: "var(--persimmon)" }}>
          请先在「AI 模型」中为某个服务商添加 Embedding 模型，再在这里选用。
        </p>
      )}
      <div className="field">
        <label>Embedding 模型</label>
        <select
          value={compound}
          disabled={busy}
          onChange={(e) => {
            const value = e.target.value;
            if (!value) {
              void applyRetrievalChange(
                { embeddingProviderId: "", embeddingModel: "" },
                false,
              );
              return;
            }
            const sep = value.indexOf("::");
            void applyRetrievalChange(
              {
                embeddingProviderId: value.slice(0, sep),
                embeddingModel: value.slice(sep + 2),
              },
              Boolean(cfg.embeddingModel),
            );
          }}
        >
          <option value="">未选择</option>
          {items.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>topK（每次检索条数）</label>
        <input
          type="number"
          min={1}
          max={20}
          value={cfg.topK}
          onChange={(e) => update({ topK: Number(e.target.value) || 5 })}
        />
      </div>
      <div className="field">
        <label>匹配度阈值（%）</label>
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={Math.round(cfg.scoreThreshold * 100)}
          onChange={(e) =>
            update({
              scoreThreshold: clampInt(e.target.value, 0, 100, 50) / 100,
            })
          }
        />
        <p className="field-hint field-hint--after">
          余弦相似度低于此值的分块视为不相关，不注入对话、不作为工具命中。0 表示不过滤。改此项不重建索引。
        </p>
      </div>
      <div className="field">
        <label>chunkSize</label>
        <input
          type="number"
          min={128}
          max={8192}
          defaultValue={cfg.chunkSize}
          key={`chunk-${cfg.chunkSize}`}
          disabled={busy}
          onBlur={(e) => {
            const next = Number(e.target.value) || 1024;
            if (next === cfg.chunkSize) return;
            void applyRetrievalChange({ chunkSize: next }, true);
          }}
        />
      </div>
      <div className="field">
        <label>chunkOverlap</label>
        <input
          type="number"
          min={0}
          max={4096}
          defaultValue={cfg.chunkOverlap}
          key={`overlap-${cfg.chunkOverlap}`}
          disabled={busy}
          onBlur={(e) => {
            const next = Number(e.target.value) || 0;
            if (next === cfg.chunkOverlap) return;
            void applyRetrievalChange({ chunkOverlap: next }, true);
          }}
        />
      </div>
    </section>
  );
}
