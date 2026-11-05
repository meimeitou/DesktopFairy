import { Button } from "@cherrystudio/ui";


import { useKnowledgeBases } from "../../hooks/useKnowledgeBases";
import "./KnowledgeBaseList.css";

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
  const { bases, loaded } = useKnowledgeBases();
  if (!loaded) return null;
  if (bases.length === 0) return <p className="kb-list-empty">还没有知识库</p>;

  return (
    <>
      {bases.map((base) => {
        const selected = selectedIds.includes(base.id);
        return (
          <Button variant="ghost" key={base.id} role="menuitemcheckbox" aria-checked={selected} className={`kb-list-row${selected ? " selected" : ""}`} disabled={disabled} onClick={() =>
              onChange(
                selected
                  ? selectedIds.filter((x) => x !== base.id)
                  : [...selectedIds, base.id],
              )
            }>
            {base.name}

          </Button>
        );
      })}
    </>
  );
}
