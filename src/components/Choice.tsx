import type { ReactNode } from "react";
import "./RadioGroup.css";

type Option = { value: string; label: ReactNode };

export function Radio({
  value,
  onChange,
  options,
  direction = "vertical",
  disabled = false,
  name,
}: {
  value?: string;
  onChange?: (value: string) => void;
  options: Option[];
  direction?: "vertical" | "horizontal";
  disabled?: boolean;
  name?: string;
}) {
  return (
    <div
      className={direction === "horizontal" ? "df-radio-group--inline" : "df-radio-group--stack"}
      role="radiogroup"
    >
      {options.map((option) => (
        <label key={option.value} className={value === option.value ? "df-radio is-checked" : "df-radio"}>
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            disabled={disabled}
            onChange={() => onChange?.(option.value)}
          />
          <span className="df-radio-mark" aria-hidden>
            <span className="df-radio-well" />
          </span>
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

export function Checkbox({
  value = [],
  onChange,
  options,
  direction = "vertical",
  disabled = false,
  className,
}: {
  value?: string[];
  onChange?: (value: string[]) => void;
  options: Option[];
  direction?: "vertical" | "horizontal";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={className} style={{ display: "flex", flexDirection: direction === "horizontal" ? "row" : "column", gap: 8 }}>
      {options.map((option) => {
        const checked = value.includes(option.value);
        return (
          <label key={option.value} className={checked ? "df-radio is-checked" : "df-radio"}>
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => {
                const next = checked
                  ? value.filter((item) => item !== option.value)
                  : [...value, option.value];
                onChange?.(next);
              }}
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
