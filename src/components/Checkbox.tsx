import { useEffect, useRef, type ReactNode } from "react";
import "./RadioGroup.css";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  label?: ReactNode;
  children?: ReactNode;
  ariaLabel?: string;
  name?: string;
  className?: string;
  compact?: boolean;
};

export default function Checkbox({
  checked,
  onChange,
  disabled = false,
  indeterminate = false,
  label,
  children,
  ariaLabel,
  name,
  className,
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const showIndeterminate = indeterminate && !checked;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = showIndeterminate;
    }
  }, [showIndeterminate]);

  return (
    <label
      className={[
        "df-radio",
        "df-radio--check",
        compact ? "df-radio--compact" : "",
        checked ? "is-checked" : "",
        showIndeterminate ? "is-indeterminate" : "",
        disabled ? "is-disabled" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        ref={inputRef}
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={() => onChange(!checked)}
      />
      <span className="df-radio-mark" aria-hidden="true">
        <span className="df-radio-well" />
      </span>
      {label ? <span className="df-radio-label">{label}</span> : null}
      {children}
    </label>
  );
}
