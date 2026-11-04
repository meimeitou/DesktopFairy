import { useCallback, useEffect, useRef, useState } from "react";
import type { VaultKnowledgeBase } from "../shared/knowledge";

/** Small vault summaries only; note contents stay in the worker/disk. */
export function useKnowledgeBases() {
  const [bases, setBases] = useState<VaultKnowledgeBase[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const request = useRef(0);
  const reload = useCallback(async () => {
    const id = ++request.current;
    try {
      const rows = await window.electronAPI.invoke("knowledge:list_bases");
      if (mounted.current && id === request.current) {
        setBases(Array.isArray(rows) ? rows as VaultKnowledgeBase[] : []);
        setLoaded(true); setError("");
      }
    } catch (cause) {
      if (mounted.current && id === request.current) setError(String(cause instanceof Error ? cause.message : cause));
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = window.electronAPI.onKnowledgeUpdated(() => {
      if (!timer) timer = setTimeout(() => { timer = null; void reload(); }, 150);
    });
    void reload();
    return () => { mounted.current = false; clearTimeout(timer); unsubscribe(); };
  }, [reload]);
  return { bases, loaded, error, reload };
}
