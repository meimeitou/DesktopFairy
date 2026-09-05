export type AgentConfigSection =
  | "basic"
  | "prompt"
  | "builtin"
  | "mcp"
  | "skills"
  | "advanced";

export const AGENT_CONFIG_SECTIONS: { id: AgentConfigSection; label: string }[] = [
  { id: "basic", label: "基础设置" },
  { id: "prompt", label: "SOUL / USER" },
  { id: "builtin", label: "内置工具" },
  { id: "mcp", label: "MCP" },
  { id: "skills", label: "技能" },
  { id: "advanced", label: "高级" },
];
