export type ReasoningEffort = "default" | "low" | "medium" | "high";

export interface ReasoningEffortCard {
  value: ReasoningEffort;
  title: string;
  description: string;
  /** Visual accent color. */
  accent: string;
}

export const REASONING_EFFORT_CARDS: ReasoningEffortCard[] = [
  {
    value: "default",
    title: "默认",
    description: "不发送参数，依赖模型默认行为。",
    accent: "#a3a3a3",
  },
  {
    value: "low",
    title: "浅思",
    description: "低强度推理，更快更省。",
    accent: "#00b96b",
  },
  {
    value: "medium",
    title: "斟酌",
    description: "中强度推理，兼顾深度与速度。",
    accent: "#f59e0b",
  },
  {
    value: "high",
    title: "沉思",
    description: "高强度推理，更深入但更慢。",
    accent: "#ef4444",
  },
];

export const DEFAULT_REASONING_EFFORT: ReasoningEffort = "default";

export function normalizeReasoningEffort(value: unknown): ReasoningEffort {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return DEFAULT_REASONING_EFFORT;
}

export function getReasoningEffortCard(
  value: ReasoningEffort
): ReasoningEffortCard {
  return (
    REASONING_EFFORT_CARDS.find((c) => c.value === value) ??
    REASONING_EFFORT_CARDS[0]
  );
}
