import { Button } from "animal-island-ui";
import { useEffect, useState } from "react";
import type { KnowledgeBase } from "../../shared/knowledge";
import "./KnowledgeBaseList.css";

const api = window.electronAPI;

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

/** 可勾选的知识库列表（无触发按钮、无弹层），由调用方提供容器。 */
export default function KnowledgeBaseList({
  selectedIds,
  onChange,
  disabled,
}: Props) {
  const [bases, setBases] = useState<KnowledgeBase[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .invoke("knowledge:list_bases")
      .then((rows) => {
        if (!cancelled) setBases(Array.isArray(rows) ? (rows as KnowledgeBase[]) : []);
      })
      .catch(() => {
        if (!cancelled) setBases([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!bases) return null;
  if (bases.length === 0) return <p className="kb-list-empty">还没有知识库</p>;

  return (
    <>
      {bases.map((base) => {
        const selected = selectedIds.includes(base.id);
        return (
          <Button
            key={base.id}
            type="text"
            role="menuitemcheckbox"
            aria-checked={selected}
            className={`kb-list-row${selected ? " selected" : ""}`}
            disabled={disabled}
            onClick={() =>
              onChange(
                selected
                  ? selectedIds.filter((x) => x !== base.id)
                  : [...selectedIds, base.id],
              )
            }
          >
            {base.name}
            {base.kind === "semi_structured" && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 10,
                  padding: "0 4px",
                  borderRadius: 3,
                  background: "var(--persimmon-softer)",
                }}
              >
                半
              </span>
            )}
          </Button>
        );
      })}
    </>
  );
}
