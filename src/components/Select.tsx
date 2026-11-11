import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { ChevronDown } from "lucide-react";
import { measureDropdownSpace } from "../shared/dropdownBounds";
import "./Select.css";

export interface SelectOption {
  key: string;
  label: string;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (key: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** 对外暴露的无障碍标签（无可见 label 时使用） */
  "aria-label"?: string;
  /** 关联外部可见 label 的 id */
  "aria-labelledby"?: string;
}

/**
 * 自建下拉框：选项面板向上/向下展开，随触发器宽度。
 * 视觉沿用 ModelSelector 面板语言。
 */
export default function Select({
  options,
  value,
  onChange,
  placeholder = "请选择",
  disabled = false,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [listMaxHeight, setListMaxHeight] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const uid = useId().replace(/:/g, "");
  const listboxId = `df-select-${uid}-listbox`;

  const selectedIndex = options.findIndex((o) => o.key === value);
  const selectedLabel =
    selectedIndex >= 0 ? options[selectedIndex].label : placeholder;

  const commit = useCallback(
    (key: string) => {
      onChange(key);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onChange],
  );

  // Close on outside click / Escape / ancestor scroll (panel is absolutely
  // positioned; a scrolling ancestor would detach it from the trigger).
  useEffect(() => {
    if (!open) return;
    const openedAt = Date.now();
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (Date.now() - openedAt < 150) return;
      if (!listRef.current?.contains(e.target as Node)) setOpen(false);
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

  // Reset highlight to current value on open; pick a direction that fits.
  useLayoutEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setDropUp(rect.top > window.innerHeight - rect.bottom);
    // 面板会被最近的 overflow 祖先（弹窗体/滚动容器）裁剪：压缩高度而非溢出。
    if (triggerRef.current && rect) {
      const goingUp = rect.top > window.innerHeight - rect.bottom;
      const { spaceAbove, spaceBelow } = measureDropdownSpace(triggerRef.current);
      const below = Math.min(spaceBelow, window.innerHeight - rect.bottom);
      const budget = Math.max(120, Math.min(goingUp ? spaceAbove : below, 240));
      setListMaxHeight(budget < 240 ? budget : null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep active option in view while navigating.
  useEffect(() => {
    if (!open || activeIndex === null) return;
    const items = listRef.current?.querySelectorAll("li");
    items?.[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const moveActive = (delta: number) => {
    if (!options.length) return;
    setActiveIndex((prev) => {
      if (prev === null) return delta > 0 ? 0 : options.length - 1;
      return (prev + delta + options.length) % options.length;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveActive(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveActive(-1);
        break;
      case "Home":
        e.preventDefault();
        if (options.length) setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        if (options.length) setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (activeIndex !== null && options[activeIndex])
          commit(options[activeIndex].key);
        break;
    }
  };

  return (
    <div
      className={`df-select${open ? " open" : ""}${dropUp ? " drop-up" : ""}${
        disabled ? " disabled" : ""
      }`}
      ref={containerRef}
    >
      <button
        type="button"
        className="df-select-trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        ref={triggerRef}
      >
        <span
          className={`df-select-value${selectedIndex >= 0 ? "" : " placeholder"}`}
        >
          {selectedLabel}
        </span>
        <span className="df-select-caret" aria-hidden="true">
          <ChevronDown size={10} />
        </span>
      </button>
      {open && (
        <ul className="df-select-list" role="listbox" id={listboxId} ref={listRef} style={listMaxHeight ? { maxHeight: listMaxHeight } : undefined}>
          {options.map((opt, i) => (
            <li key={opt.key} role="option" aria-selected={i === selectedIndex}>
              <button
                type="button"
                className={`df-select-option${i === selectedIndex ? " selected" : ""}${
                  i === activeIndex ? " active" : ""
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={(event) => {
                  // FormItem wraps controls in a label. Closing removes this
                  // button before the label's default activation, which would
                  // otherwise click the trigger and reopen the menu.
                  event.preventDefault();
                  commit(opt.key);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
