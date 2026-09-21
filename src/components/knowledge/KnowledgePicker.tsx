import { Button, Icon, Tooltip } from "animal-island-ui";
import { useEffect, useRef, useState } from "react";
import type { KnowledgeBase } from "../../shared/knowledge";
import type { KnowledgeCitation } from "../../shared/knowledge";
import "./KnowledgePicker.css";

const api = window.electronAPI;

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
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
      <Tooltip title={tip}>
        <Button
          type="text"
          size="small"
          className={`chat-tool-btn${selectedIds.length || open ? " active" : ""}`}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          aria-label={tip}
          icon={<Icon name="Book" size={16} />}
        >
          {selectedIds.length > 0 && (
            <span className="kb-picker-count">{selectedIds.length}</span>
          )}
        </Button>
      </Tooltip>
      {open && (
        <div className="kb-picker-menu" role="menu" aria-label="选择知识库">
          {bases.length === 0 ? (
            <p className="kb-picker-empty">还没有知识库</p>
          ) : (
            bases.map((base) => {
              const selected = selectedIds.includes(base.id);
              return (
                <Button
                  key={base.id}
                  type="text"
                  role="menuitemcheckbox"
                  aria-checked={selected}
                  className={`kb-picker-row${selected ? " selected" : ""}`}
                  onClick={() => toggle(base.id)}
                >
                  {base.name}
                  {base.kind === "semi_structured" && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        padding: "0 4px",
                        borderRadius: 3,
                        background: "rgba(120,140,200,0.2)",
                      }}
                    >
                      半
                    </span>
                  )}
                </Button>
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
            <Button
              type="link"
              size="small"
              className="kb-citation-btn"
              onClick={() => setOpenId(openId === key ? null : key)}
              title={
                c.kind === "semi_structured"
                  ? "半结构化文件（全文注入）"
                  : "向量片段"
              }
            >
              {c.kind === "semi_structured" ? "📄 " : ""}
              {c.baseName} / {c.sourceName}
            </Button>
            {openId === key && (
              <div className="kb-citation-pop">
                {c.kind === "semi_structured" ? (
                  <>
                    <p style={{ fontSize: 11, opacity: 0.7 }}>
                      本次已整篇注入上下文。描述预览：
                    </p>
                    <pre>{c.text || "（无描述）"}</pre>
                  </>
                ) : (
                  <pre>{c.text}</pre>
                )}
                {onOpen && (
                  <Button type="text" onClick={() => onOpen(c)}>
                    在知识库中查看
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
