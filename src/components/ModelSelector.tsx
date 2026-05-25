import { useMemo, useState } from "react";
import "./ModelSelector.css";

interface Props {
  models: string[];
  value: string;
  onChange: (modelId: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
}

export default function ModelSelector({
  models,
  value,
  onChange,
  placeholder = "选择模型…",
  allowCustom = true,
}: Props) {
  const [query, setQuery] = useState("");
  const [useCustom, setUseCustom] = useState(
    () => value.length > 0 && !models.includes(value)
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => m.toLowerCase().includes(q));
  }, [models, query]);

  const showSearch = models.length > 8;

  if (allowCustom && (useCustom || models.length === 0)) {
    return (
      <div className="model-selector">
        {showSearch && models.length > 0 && (
          <input
            type="search"
            className="model-selector-search"
            placeholder="搜索模型…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        <div className="model-selector-row">
          <input
            type="text"
            className="model-selector-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
          {models.length > 0 && (
            <button
              type="button"
              className="model-selector-mode-btn"
              onClick={() => setUseCustom(false)}
            >
              从列表选择
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="model-selector">
      {showSearch && (
        <input
          type="search"
          className="model-selector-search"
          placeholder="搜索模型…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      <div className="model-selector-row">
        <select
          className="model-selector-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {!models.includes(value) && value && (
            <option value={value}>{value}</option>
          )}
          {filtered.length === 0 ? (
            <option value="">{placeholder}</option>
          ) : (
            filtered.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))
          )}
        </select>
        {allowCustom && (
          <button
            type="button"
            className="model-selector-mode-btn"
            onClick={() => setUseCustom(true)}
          >
            自定义
          </button>
        )}
      </div>
    </div>
  );
}
