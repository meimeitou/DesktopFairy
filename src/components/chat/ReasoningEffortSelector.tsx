import { Button } from "animal-island-ui";
import { useState, useRef, useEffect, useId } from "react";
import type { ReasoningEffort } from "../../shared/reasoningEffort";
import "./ReasoningEffortSelector.css";

interface Props {
  value: ReasoningEffort;
  onChange: (value: ReasoningEffort) => void;
  disabled?: boolean;
}

const LEVELS = ["default", "low", "medium", "high"] as const;
const LABELS: Record<ReasoningEffort, string> = {
  default: "默认", low: "低", medium: "中", high: "高",
};

export default function ReasoningEffortSelector({ value, onChange, disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const isDefault = value === "default";
  const index = LEVELS.indexOf(value);
  const visible = open && !disabled;

  useEffect(() => {
    if (!visible) return;
    sliderRef.current?.focus();
    const onDocClick = (event: MouseEvent) => {
      if (hostRef.current && !hostRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        hostRef.current?.querySelector<HTMLButtonElement>(".reasoning-effort-trigger")?.focus();
      }
    };
    const onFocusOut = (event: FocusEvent) => {
      if (hostRef.current && !hostRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusOut);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusOut);
    };
  }, [visible]);

  const selectLevel = (position: number) => {
    if (!disabled) onChange(LEVELS[position]);
  };

  return (
    <div className="reasoning-effort-selector" ref={hostRef}>
      <Button
        type="text"
        size="small"
        className={`reasoning-effort-trigger${visible ? " open" : ""}`}
        onClick={() => setOpen((previous) => !previous)}
        disabled={disabled}
        title={`思考强度：${LABELS[value]}`}
        aria-label={`思考强度：${LABELS[value]}`}
        aria-haspopup="dialog"
        aria-expanded={visible}
        aria-controls={visible ? panelId : undefined}
      >
        {LABELS[value]}
      </Button>
      {visible && (
        <div id={panelId} className="reasoning-effort-panel" role="dialog" aria-label="思考强度">
          <div className="reasoning-effort-panel-header">
            <span>思考强度</span>
          </div>
          <input
            ref={sliderRef}
            className={`reasoning-effort-slider${isDefault ? " is-default" : ""}`}
            type="range"
            min={0}
            max={3}
            step={1}
            value={index}
            aria-label="思考强度"
            aria-valuetext={isDefault ? "默认，跟随模型" : LABELS[value]}
            onChange={(event) => selectLevel(Number(event.target.value))}
          />
          <div className="reasoning-effort-ticks" aria-hidden="true">
            {LEVELS.map((level) => <span key={level} className={value === level ? "selected" : undefined}>{LABELS[level]}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
