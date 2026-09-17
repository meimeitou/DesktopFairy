import { createContext } from "react";

/**
 * 取消当前单个工具调用（不中止整个流）。
 * 参数为该次工具调用的 toolCallId。
 */
export const ToolCancelContext = createContext<
  ((toolCallId: string) => void) | null
>(null);
