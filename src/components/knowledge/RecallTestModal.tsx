import { useMemo, useState } from "react";
import type { KnowledgeHit } from "../../shared/knowledge";
import {
  clampInt,
  clampUnit,
  DEFAULT_KNOWLEDGE_SCORE_THRESHOLD,
  DEFAULT_KNOWLEDGE_TOP_K,
  isRelevantHit,
  scoreToPercent,
} from "../../shared/knowledge";

const api = window.electronAPI;

function formatScore(score: number): string {
  if (!Number.isFinite(score)) return "—";
  return `${(Math.max(-1, Math.min(1, score)) * 100).toFixed(1)}%`;
}

function scoreWidth(score: number): string {
  if (!Number.isFinite(score)) return "0%";
  return `${Math.max(0, Math.min(1, score)) * 100}%`;
}

export default function RecallTestModal({
  baseId,
  baseName,
  defaultTopK,
  defaultScoreThreshold,
  embeddingReady,
  completedCount,
  onClose,
  onOpenItem,
}: {
  baseId: string;
  baseName: string;
  defaultTopK: number;
  defaultScoreThreshold: number;
  embeddingReady: boolean;
  completedCount: number;
  onClose: () => void;
  onOpenItem: (itemId: string, sourceName: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(
    clampInt(defaultTopK, 1, 20, DEFAULT_KNOWLEDGE_TOP_K),
  );
  const [thresholdPct, setThresholdPct] = useState(
    scoreToPercent(clampUnit(defaultScoreThreshold, DEFAULT_KNOWLEDGE_SCORE_THRESHOLD)),
  );
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [hits, setHits] = useState<KnowledgeHit[] | null>(null);
  const threshold = thresholdPct / 100;
  const relevantCount = useMemo(
    () => (hits || []).filter((hit) => isRelevantHit(hit.score, threshold)).length,
    [hits, threshold],
  );

  const runSearch = async () => {
    const q = query.trim();
    if (!q || searching) return;
    if (!embeddingReady) {
      setError("尚未配置全局 embedding 模型，请到左下角设置完成配置。");
      return;
    }
    if (completedCount === 0) {
      setError("当前知识库还没有已完成索引的条目。");
      return;
    }
    setSearching(true);
    setError("");
    try {
      const rows = (await api.invoke("knowledge:search", {
        query: q,
        baseIds: [baseId],
        topK,
        includeBelowThreshold: true,
      })) as KnowledgeHit[];
      setHits(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setHits(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="kb-modal" onClick={onClose}>
      <div
        className="kb-modal-card kb-recall-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="kb-settings-modal-header">
          <div>
            <h3>召回测试</h3>
            <p className="field-hint">
              对「{baseName}」走与对话相同的向量检索。低于匹配度阈值的分块不会进入对话。
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost kb-settings-close"
            onClick={onClose}
            aria-label="关闭"
          >
            关闭
          </button>
        </header>
        <div className="field">
          <label htmlFor="kb-recall-query">问题</label>
          <textarea
            id="kb-recall-query"
            rows={3}
            value={query}
            placeholder="输入要检索的问题"
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void runSearch();
              }
            }}
          />
        </div>
        <div className="kb-recall-toolbar">
          <label className="kb-recall-topk">
            <span>topK</span>
            <input
              type="number"
              min={1}
              max={20}
              value={topK}
              onChange={(e) =>
                setTopK(clampInt(e.target.value, 1, 20, DEFAULT_KNOWLEDGE_TOP_K))
              }
            />
          </label>
          <label className="kb-recall-topk">
            <span>匹配度</span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={thresholdPct}
              onChange={(e) =>
                setThresholdPct(clampInt(e.target.value, 0, 100, 50))
              }
            />
            <span>%</span>
          </label>
          <span className="kb-modal-spacer" />
          <button
            type="button"
            className="btn-secondary"
            disabled={!query.trim() || searching}
            onClick={() => void runSearch()}
          >
            {searching ? "检索中…" : "检索"}
          </button>
        </div>
        {error && <p className="kb-item-error">{error}</p>}
        {hits && hits.length === 0 && !error && (
          <p className="kb-empty">没有命中分块。确认条目已完成索引后再试。</p>
        )}
        {hits && hits.length > 0 && relevantCount === 0 && (
          <p className="field-hint">
            这 {hits.length} 条都低于 {thresholdPct}% 阈值，对话里不会注入。可下调匹配度再看。
          </p>
        )}
        {hits && hits.length > 0 && relevantCount > 0 && relevantCount < hits.length && (
          <p className="field-hint">
            {relevantCount} 条达到阈值，{hits.length - relevantCount} 条低于阈值（灰色，不进入对话）。
          </p>
        )}
        {hits && hits.length > 0 && (
          <ol className="kb-recall-list">
            {hits.map((hit, index) => {
              const relevant = isRelevantHit(hit.score, threshold);
              return (
                <li
                  key={`${hit.itemId}-${hit.chunkIndex}-${index}`}
                  className={`kb-recall-hit${relevant ? "" : " below"}`}
                >
                  <div className="kb-recall-hit-head">
                    <span className="kb-recall-rank">{index + 1}</span>
                    <button
                      type="button"
                      className="kb-recall-source"
                      title="预览该条目"
                      onClick={() => onOpenItem(hit.itemId, hit.sourceName)}
                    >
                      {hit.sourceName}
                    </button>
                    <span className="kb-recall-meta">
                      {hit.itemType === "note" ? "笔记" : "文件"} · 分块 {hit.chunkIndex + 1}
                      {relevant ? "" : " · 未达阈值"}
                    </span>
                    <span className="kb-recall-score">{formatScore(hit.score)}</span>
                  </div>
                  <div className="kb-recall-bar" aria-hidden="true">
                    <span style={{ width: scoreWidth(hit.score) }} />
                  </div>
                  <pre className="kb-recall-text">{hit.text.trim() || "（空分块）"}</pre>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
