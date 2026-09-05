import { useEffect, useRef, useState } from "react";
import type { KnowledgeBase } from "../../shared/knowledge";
import type { KnowledgeCitation } from "../../shared/knowledge";
import Tooltip from "../Tooltip";
import "./KnowledgePicker.css";

const api = window.electronAPI;

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

function BookIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export default function KnowledgePicker({ selectedIds, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    void api.invoke("knowledge:list_bases").then((rows) => {
      setBases(Array.isArray(rows) ? (rows as KnowledgeBase[]) : []);
    }).catch(() => setBases([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  };

  const tip = selectedIds.length
    ? `知识库（已选 ${selectedIds.length}）`
    : "选择知识库";

  return (
    <div className="kb-picker" ref={rootRef}>
      <Tooltip tip={tip}>
        <button
          type="button"
          className={`chat-tool-btn${selectedIds.length || open ? " active" : ""}`}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          aria-label={tip}
        >
          <BookIcon />
          {selectedIds.length > 0 && (
            <span className="kb-picker-count">{selectedIds.length}</span>
          )}
        </button>
      </Tooltip>
      {open && (
        <div className="kb-picker-menu" role="menu" aria-label="选择知识库">
          {bases.length === 0 ? (
            <p className="kb-picker-empty">还没有知识库</p>
          ) : (
            bases.map((base) => {
              const selected = selectedIds.includes(base.id);
              return (
                <button
                  key={base.id}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={selected}
                  className={`kb-picker-row${selected ? " selected" : ""}`}
                  onClick={() => toggle(base.id)}
                >
                  {base.name}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function KnowledgeCitations({
  citations,
  onOpen,
}: {
  citations?: KnowledgeCitation[];
  onOpen?: (citation: KnowledgeCitation) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (!citations?.length) return null;
  return (
    <div className="kb-citations">
      {citations.map((c, i) => {
        const key = `${c.itemId}-${i}`;
        return (
          <div key={key} className="kb-citation">
            <button
              type="button"
              className="kb-citation-btn"
              onClick={() => setOpenId(openId === key ? null : key)}
            >
              {c.baseName} / {c.sourceName}
            </button>
            {openId === key && (
              <div className="kb-citation-pop">
                <pre>{c.text}</pre>
                {onOpen && (
                  <button type="button" onClick={() => onOpen(c)}>
                    在知识库中查看
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
