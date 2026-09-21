import { Button, Icon, Input } from "animal-island-ui";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  /** Panel placement: "up-left" opens upward right-aligned (bottom toolbars); "auto" picks by viewport. */
  panelDirection?: "up-left" | "auto";
  /** Trigger skin: "toolbar" = borderless inline (chat/terminal toolbars); "field" = input-like box (settings). */
  variant?: "toolbar" | "field";
}

export default function ModelSelector({
  models,
  value,
  onChange,
  placeholder = "选择模型…",
  allowCustom = true,
  disabled = false,
  modelLabels,
  panelDirection = "auto",
  variant = "field",
}: Props) {
  const [query, setQuery] = useState("");
  // null = auto (custom when value is outside the list); explicit overrides from buttons.
  const [modeOverride, setModeOverride] = useState<"custom" | "list" | null>(
    () =>
      allowCustom && value.length > 0 && !models.includes(value)
        ? "custom"
        : null,
  );
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [alignEnd, setAlignEnd] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => {
      const label = modelLabels?.[m] ?? m;
      return m.toLowerCase().includes(q) || label.toLowerCase().includes(q);
    });
  }, [models, query, modelLabels]);

  const valueOutsideList = value.length > 0 && !models.includes(value);
  const useCustom =
    allowCustom &&
    (models.length === 0 ||
      modeOverride === "custom" ||
      (modeOverride !== "list" && valueOutsideList));

  // Display-only fallback when custom entry is disabled — parents own persistence.
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

  useLayoutEffect(() => {
    if (!open) return;
    containerRef.current?.querySelector("input")?.focus();
    if (panelDirection !== "auto" || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;
    setDropUp(rect.top > spaceBelow);
    // Prefer expanding toward the side with more room (chat toolbar sits on the right).
    setAlignEnd(spaceLeft >= spaceRight);
  }, [open, panelDirection]);

  if (useCustom) {
    return (
      <div className="model-selector">
        <div className="model-selector-row">
          <Input
            type="text"
            shadow
            className="model-selector-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
          />
          {models.length > 0 && (
            <Button
              type="text"
              size="small"
              className="model-selector-mode-btn"
              onClick={() => setModeOverride("list")}
            >
              从列表选择
            </Button>
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
    effectiveValue && !models.includes(effectiveValue) ? effectiveValue : null;
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
            panelDirection === "up-left" || dropUp ? " drop-up" : ""
          }${panelDirection === "up-left" || alignEnd ? " align-end" : ""}`}
          ref={containerRef}
        >
          <Button
            type="text"
            className={`model-selector-trigger variant-${variant}`}
            onClick={() => !disabled && setOpen((o) => !o)}
            disabled={disabled}
          >
            <span
              className={`model-selector-value${
                effectiveValue ? "" : " placeholder"
              }`}
              title={effectiveValue ? selectedLabel : undefined}
            >
              {selectedLabel}
            </span>
            <span className="model-selector-caret" aria-hidden="true">
              <Icon name="Play" size={10} />
            </span>
          </Button>
          {open && (
            <div className="model-selector-panel" role="listbox">
              <div className="model-selector-search-wrap">
                <Input
                  type="search"
                  shadow
                  allowClear
                  placeholder="搜索模型…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="model-selector-list">
                {showCustomEntry && customLabel && customValue && (
                  <Button
                    type="text"
                    role="option"
                    aria-selected
                    className="model-selector-option selected"
                    title={customLabel}
                    onClick={() => {
                      onChange(customValue);
                      setOpen(false);
                    }}
                  >
                    {customLabel}
                  </Button>
                )}
                {filtered.length === 0 && !showCustomEntry ? (
                  <div className="model-selector-empty">无匹配模型</div>
                ) : (
                  filtered.map((m) => (
                    <Button
                      key={m}
                      type="text"
                      role="option"
                      aria-selected={m === effectiveValue}
                      className={`model-selector-option${
                        m === effectiveValue ? " selected" : ""
                      }`}
                      title={modelLabels?.[m] ?? m}
                      onClick={() => {
                        onChange(m);
                        setModeOverride(null);
                        setOpen(false);
                      }}
                    >
                      {modelLabels?.[m] ?? m}
                    </Button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        {allowCustom && (
          <Button
            type="text"
            size="small"
            className="model-selector-mode-btn"
            onClick={() => setModeOverride("custom")}
          >
            自定义
          </Button>
        )}
      </div>
    </div>
  );
}
