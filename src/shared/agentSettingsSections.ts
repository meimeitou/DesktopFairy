export type AgentConfigSection =
  | "basic"
  | "prompt"
  | "tools"
  | "skills"
  | "advanced";

export const AGENT_CONFIG_SECTIONS: { id: AgentConfigSection; label: string }[] = [
  { id: "basic", label: "基础设置" },
  { id: "prompt", label: "SOUL / USER" },
  { id: "tools", label: "工具" },
  { id: "skills", label: "技能" },
  { id: "advanced", label: "高级" },
];
