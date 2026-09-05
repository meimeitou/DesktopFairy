import { useEffect, useRef, useState } from "react";
import { slashMenuQuery } from "../shared/slashCommands";
import type { SlashCommand } from "../shared/slashCommands";

export function useSlashCommandMenu(
  input: string,
  disabled: boolean,
  commands?: SlashCommand[],
) {
  const [dismissed, setDismissed] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const query = slashMenuQuery(input);
  const inSlash = input.trimStart().startsWith("/");
  const [wasInSlash, setWasInSlash] = useState(inSlash);
  if (inSlash !== wasInSlash) {
    setWasInSlash(inSlash);
    if (!inSlash) setDismissed(false);
  }
  const open = !disabled && !dismissed && query !== null && !!commands?.length;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (hostRef.current && !hostRef.current.contains(e.target as Node)) {
        setDismissed(true);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return {
    open,
    query: query ?? "",
    hostRef,
    close: () => setDismissed(true),
  };
}
