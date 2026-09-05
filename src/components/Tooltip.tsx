import type { ReactNode } from "react";
import "./Tooltip.css";

interface Props {
  tip: string;
  children: ReactNode;
  placement?: "top" | "bottom";
  variant?: "default" | "help";
}

export default function Tooltip({
  tip,
  children,
  placement = "top",
  variant = "default",
}: Props) {
  return (
    <span
      className={`ui-tooltip-wrap ui-tooltip-${placement}${
        variant === "help" ? " ui-tooltip-help" : ""
      }`}
      data-tip={tip}
    >
      {children}
    </span>
  );
}
