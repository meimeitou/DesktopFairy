import "./RadioGroup.css";

export type RadioItem<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
};

type Props<T extends string> = {
  name: string;
  value: T | null;
  options: RadioItem<T>[];
  onChange: (value: T) => void;
  layout?: "stack" | "inline";
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
};

function OptionRow<T extends string>({
  type,
  name,
  opt,
  checked,
  disabled,
  onToggle,
}: {
  type: "radio" | "checkbox";
  name: string;
  opt: RadioItem<T>;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={[
        "df-radio",
        type === "checkbox" ? "df-radio--check" : "",
        checked ? "is-checked" : "",
        disabled ? "is-disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        type={type}
        name={name}
        value={opt.value}
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
      />
      <span className="df-radio-mark" aria-hidden="true">
        <span className="df-radio-well" />
      </span>
      <span className="df-radio-body">
        <span className="df-radio-label">{opt.label}</span>
        {opt.description ? (
          <span className="df-radio-desc">{opt.description}</span>
        ) : null}
      </span>
    </label>
  );
}

export default function RadioGroup<T extends string>({
  name,
  value,
  options,
  onChange,
  layout = "stack",
  ariaLabel,
  disabled = false,
  className,
}: Props<T>) {
  return (
    <div
      className={[
        "df-radio-group",
        `df-radio-group--${layout}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <OptionRow
          key={opt.value}
          type="radio"
          name={name}
          opt={opt}
          checked={value === opt.value}
          disabled={disabled || Boolean(opt.disabled)}
          onToggle={() => onChange(opt.value)}
        />
      ))}
    </div>
  );
}

type CheckProps<T extends string> = {
  name: string;
  values: T[];
  options: RadioItem<T>[];
  onChange: (values: T[]) => void;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
};

export function CheckGroup<T extends string>({
  name,
  values,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  className,
}: CheckProps<T>) {
  const selected = new Set(values);
  return (
    <div
      className={["df-radio-group", "df-radio-group--stack", className]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const checked = selected.has(opt.value);
        return (
          <OptionRow
            key={opt.value}
            type="checkbox"
            name={name}
            opt={opt}
            checked={checked}
            disabled={disabled || Boolean(opt.disabled)}
            onToggle={() => {
              if (checked) onChange(values.filter((v) => v !== opt.value));
              else onChange([...values, opt.value]);
            }}
          />
        );
      })}
    </div>
  );
}
