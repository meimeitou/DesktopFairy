import { createContext } from "react";

export const TerminalStopContext = createContext<(() => void) | null>(null);
