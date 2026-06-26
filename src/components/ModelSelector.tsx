import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./ModelSelector.css";

interface Props {
  models: string[];
  value: string;
  onChange: (modelId: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
  disabled?: boolean;
  /** Optional display labels keyed by model value. Falls back to the value itself. */
  modelLabels?: Record<string, string>;
}

export default function ModelSelector({
  models,
  value,
  onChange,
  placeholder = "选择模型…",
  allowCustom = true,
  disabled = false,
  modelLabels,
}: Props) {
  const [query, setQuery] = useState("");
  const [useCustom, setUseCustom] = useState(
    () => value.length > 0 && !models.includes(value),
  );
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => {
      const label = modelLabels?.[m] ?? m;
      return m.toLowerCase().includes(q) || label.toLowerCase().includes(q);
    });
  }, [models, query, modelLabels]);

  const effectiveValue =
    !allowCustom && value && !models.includes(value)
      ? (models[0] ?? "")
      : value;

  // Close on outside click / Escape; reset query when closed.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Focus the search field on open and pick a direction that fits the viewport.
  useLayoutEffect(() => {
    if (!open) return;
    if (searchRef.current) searchRef.current.focus();
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(rect.top > spaceBelow);
    }
  }, [open]);

  if (allowCustom && (useCustom || models.length === 0)) {
    return (
      <div className="model-selector">
        <div className="model-selector-row">
          <input
            type="text"
            className="model-selector-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
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

  const selectedLabel = effectiveValue
    ? (modelLabels?.[effectiveValue] ?? effectiveValue)
    : placeholder;

  // Show the current custom (non-listed) value as the first entry so users can
  // see and keep it when search is empty or matches it.
  const customValue =
    effectiveValue && !models.includes(effectiveValue)
      ? effectiveValue
      : null;
  const customLabel = customValue
    ? (modelLabels?.[customValue] ?? customValue)
    : null;
  const showCustomEntry =
    customLabel !== null &&
    (query.trim() === "" ||
      customLabel.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="model-selector">
      <div className="model-selector-row">
        <div
          className={`model-selector-combo${open ? " open" : ""}${
            dropUp ? " drop-up" : ""
          }`}
          ref={containerRef}
        >
          <button
            type="button"
            className="model-selector-trigger"
            onClick={() => !disabled && setOpen((o) => !o)}
            disabled={disabled}
          >
            <span
              className={`model-selector-value${
                effectiveValue ? "" : " placeholder"
              }`}
            >
              {selectedLabel}
            </span>
            <span className="model-selector-caret" aria-hidden="true">
              ▾
            </span>
          </button>
          {open && (
            <div className="model-selector-panel" role="listbox">
              <div className="model-selector-search-wrap">
                <input
                  ref={searchRef}
                  type="search"
                  className="model-selector-search"
                  placeholder="搜索模型…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="model-selector-list">
                {showCustomEntry && customLabel && customValue && (
                  <button
                    type="button"
                    role="option"
                    aria-selected
                    className="model-selector-option selected"
                    onClick={() => {
                      onChange(customValue);
                      setOpen(false);
                    }}
                  >
                    {customLabel}
                  </button>
                )}
                {filtered.length === 0 && !showCustomEntry ? (
                  <div className="model-selector-empty">无匹配模型</div>
                ) : (
                  filtered.map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="option"
                      aria-selected={m === effectiveValue}
                      className={`model-selector-option${
                        m === effectiveValue ? " selected" : ""
                      }`}
                      onClick={() => {
                        onChange(m);
                        setOpen(false);
                      }}
                    >
                      {modelLabels?.[m] ?? m}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
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
