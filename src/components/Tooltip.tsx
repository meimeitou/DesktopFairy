import type { ReactNode } from "react";
import "./Tooltip.css";

interface Props {
  tip: string;
  children: ReactNode;
  placement?: "top" | "bottom";
}

export default function Tooltip({ tip, children, placement = "top" }: Props) {
  return (
    <span
      className={`ui-tooltip-wrap ui-tooltip-${placement}`}
      data-tip={tip}
    >
      {children}
    </span>
  );
}
