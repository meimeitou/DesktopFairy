import { Button, Input } from "@cherrystudio/ui";

import { ChevronDown } from "lucide-react";
import { measureDropdownSpace } from "../shared/dropdownBounds";
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
  const [panelMaxHeight, setPanelMaxHeight] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
    // Panel is absolutely positioned; a scrolling ancestor (settings body,
    // modal body) would detach it from the trigger — close instead. Skip the
    // programmatic scrolls triggered by focusing the search input on open.
    const openedAt = Date.now();
    const onScroll = (e: Event) => {
      if (Date.now() - openedAt < 150) return;
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    containerRef.current?.querySelector("input")?.focus();
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
    if (!containerRef.current) return;
    // 面板会被最近的 overflow 祖先（弹窗体/滚动容器）裁剪：
    // 按该祖先边界压缩面板高度；空间不够时改向上展开。
    const trigger = containerRef.current.querySelector<HTMLElement>(".model-selector-trigger");
    const { spaceAbove, spaceBelow: spaceBelowClipped } = trigger
      ? measureDropdownSpace(trigger)
      : { spaceAbove: Infinity, spaceBelow: Infinity };
    const viewportSpaceBelow = window.innerHeight - containerRef.current.getBoundingClientRect().bottom;
    const spaceBelow = Math.min(spaceBelowClipped, viewportSpaceBelow);
    const maxPanel = 352; // 面板满高（搜索框 + 列表 max-height 224 + padding）
    const preferUp = spaceAbove > spaceBelow && spaceAbove > 120;
    setDropUp(preferUp);
    const budget = Math.max(160, Math.min(preferUp ? spaceAbove : spaceBelow, maxPanel));
    setPanelMaxHeight(budget < maxPanel ? budget : null);
    if (panelDirection !== "auto") return;
    const rect = containerRef.current.getBoundingClientRect();
    // Prefer expanding toward the side with more room (chat toolbar sits on the right).
    setAlignEnd(rect.left >= window.innerWidth - rect.right);
  }, [open, panelDirection]);

  if (useCustom) {
    return (
      <div className="model-selector">
        <div className="model-selector-row">
          <Input type="text" className="model-selector-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} />
          {models.length > 0 && (
            <Button variant="ghost" size="sm" className="model-selector-mode-btn" onClick={() => setModeOverride("list")}>
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
          <Button variant="ghost" className={`model-selector-trigger variant-${variant}`} onClick={() => !disabled && setOpen((o) => !o)} disabled={disabled}>
            <span
              className={`model-selector-value${
                effectiveValue ? "" : " placeholder"
              }`}
              title={effectiveValue ? selectedLabel : undefined}
            >
              {selectedLabel}
            </span>
            <span className="model-selector-caret" aria-hidden="true">
              <ChevronDown size={10} />
            </span>
          </Button>
          {open && (
            <div className="model-selector-panel" role="listbox" style={panelMaxHeight ? { maxHeight: panelMaxHeight } : undefined}>
              <div className="model-selector-search-wrap">
                <Input type="search" placeholder="搜索模型…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <div className="model-selector-list" ref={listRef}>
                {showCustomEntry && customLabel && customValue && (
                  <Button variant="ghost" role="option" aria-selected className="model-selector-option selected" title={customLabel} onClick={() => {
                      onChange(customValue);
                      setOpen(false);
                    }}>
                    {customLabel}
                  </Button>
                )}
                {filtered.length === 0 && !showCustomEntry ? (
                  <div className="model-selector-empty">无匹配模型</div>
                ) : (
                  filtered.map((m) => (
                    <Button variant="ghost" key={m} role="option" aria-selected={m === effectiveValue} className={`model-selector-option${
                        m === effectiveValue ? " selected" : ""
                      }`} title={modelLabels?.[m] ?? m} onClick={() => {
                        onChange(m);
                        setModeOverride(null);
                        setOpen(false);
                      }}>
                      {modelLabels?.[m] ?? m}
                    </Button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        {allowCustom && (
          <Button variant="ghost" size="sm" className="model-selector-mode-btn" onClick={() => setModeOverride("custom")}>
            自定义
          </Button>
        )}
      </div>
    </div>
  );
}
