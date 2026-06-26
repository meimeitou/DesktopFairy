import { createContext, useContext } from "react";

export const ToolTopicContext = createContext<string | null>(null);

export function useToolTopicId(): string | null {
  return useContext(ToolTopicContext);
}
