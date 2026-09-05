import type { ReactNode } from "react";
import "./HintTip.css";
import Tooltip from "./Tooltip";

interface HintTipProps {
  tip: string;
  placement?: "top" | "bottom";
}

export default function HintTip({ tip, placement = "bottom" }: HintTipProps) {
  return (
    <Tooltip tip={tip} variant="help" placement={placement}>
      <button
        type="button"
        className="hint-tip"
        aria-label={tip}
      >
        ?
      </button>
    </Tooltip>
  );
}

interface FieldHeadProps {
  htmlFor?: string;
  hint?: string;
  placement?: "top" | "bottom";
  children: ReactNode;
}

/** Label + optional ? tip. Do not wrap the control — clicking ? must not focus the input. */
export function FieldHead({
  htmlFor,
  hint,
  placement,
  children,
}: FieldHeadProps) {
  return (
    <div className="field-head">
      {htmlFor ? (
        <label htmlFor={htmlFor}>{children}</label>
      ) : (
        <span>{children}</span>
      )}
      {hint ? <HintTip tip={hint} placement={placement} /> : null}
    </div>
  );
}
