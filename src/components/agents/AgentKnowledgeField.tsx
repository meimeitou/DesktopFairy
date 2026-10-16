import { Icon, Input, Tooltip } from "animal-island-ui";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KnowledgeBase } from "../../shared/knowledge";
import "./AgentKnowledgeField.css";


interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

/**
 * Cherry-studio 式知识库关联字段：
 * 头部行（标签 + 「添加」小按钮）→ 添加 Popover（搜索 + 未关联列表）
 * → 已关联卡片列表（图标 + 名称 + N 文档 + hover 删除钮）→ 虚线空态。
 */
export default function AgentKnowledgeField({ selectedIds, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  // cherry 的 useKnowledgeBases 常驻加载；这里挂载即拉一次（列表页/弹窗场景足够）。
  useEffect(() => {
    let alive = true;
    window.electronAPI.invoke("knowledge:list_bases")
      .then((rows) => {
        if (alive) setBases(Array.isArray(rows) ? (rows as KnowledgeBase[]) : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 失效引用收敛：知识库删除后清掉悬空 id（cherry 同款行为）。
  useEffect(() => {
    const valid = new Set(bases.map((b) => b.id));
    if (bases.length && selectedIds.some((id) => !valid.has(id))) {
      onChange(selectedIds.filter((id) => valid.has(id)));
    }
  }, [bases]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const byId = useMemo(() => new Map(bases.map((b) => [b.id, b])), [bases]);

  const linked = selectedIds.map(
    (id) => byId.get(id) ?? { id, name: `${id.slice(0, 8)}... (已失效)`, items: [] as never, kind: "plain" as never },
  );
  const addable = bases.filter(
    (b) =>
      !selectedIds.includes(b.id) &&
      (search.trim()
        ? b.name.toLowerCase().includes(search.trim().toLowerCase())
        : true),
  );

  const add = (id: string) => {
    onChange([...selectedIds, id]);
    setOpen(false);
    setSearch("");
  };
  const remove = (id: string) => onChange(selectedIds.filter((x) => x !== id));

  return (
    <div className="agent-kb-field" ref={rootRef}>
      <div className="agent-kb-head">
        <FieldHeadInline hint="控制该智能体可以检索哪些知识库。">已关联知识库</FieldHeadInline>
        <button
          type="button"
          className="agent-kb-add-btn"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name="Plus" size={12} />
          添加知识库
        </button>
      </div>

      {open && (
        <div className="agent-kb-pop" role="menu" aria-label="添加知识库">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索知识库..."
            allowClear
            size="small"
          />
          {addable.length === 0 ? (
            <p className="agent-kb-pop-empty">没有更多可用的知识库</p>
          ) : (
            addable.map((b) => (
              <button
                key={b.id}
                type="button"
                role="menuitem"
                className="agent-kb-pop-row"
                disabled={disabled}
                onClick={() => add(b.id)}
              >
                <span className="agent-kb-icon agent-kb-icon-sm">
                  <Icon name="Book" size={12} />
                </span>
                <span className="agent-kb-pop-row-main">
                  <span className="agent-kb-pop-row-name">{b.name}</span>
                  <span className="agent-kb-pop-row-desc">{b.items.length} 文档</span>
                </span>
                {b.kind === "semi_structured" && <span className="agent-kb-kind">半</span>}
              </button>
            ))
          )}
        </div>
      )}

      {linked.length === 0 ? (
        <div className="agent-kb-empty">
          <Icon name="Book" size={20} />
          <p>暂未关联知识库</p>
          <p>关联知识库后，智能体可以根据文档内容回答问题</p>
        </div>
      ) : (
        <div className="agent-kb-list">
          {linked.map((kb) => (
            <div key={kb.id} className="agent-kb-row">
              <span className="agent-kb-icon">
                <Icon name="Book" size={14} />
              </span>
              <div className="agent-kb-row-main">
                <div className="agent-kb-row-name">{kb.name}</div>
                <div className="agent-kb-row-count">
                  {kb.items.length} 文档
                  {kb.kind === "semi_structured" && <span className="agent-kb-kind">半</span>}
                </div>
              </div>
              <Tooltip title="移除">
                <button
                  type="button"
                  className="agent-kb-remove"
                  disabled={disabled}
                  aria-label="移除"
                  onClick={() => remove(kb.id)}
                >
                  <Icon name="Trash" size={12} />
                </button>
              </Tooltip>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** FieldHead 但右对齐布局用（不占用 htmlFor）。 */
function FieldHeadInline({ hint, children }: { hint?: string; children: React.ReactNode }) {
  return (
    <div className="field-head">
      <span>{children}</span>
      {hint ? <HintTipInline tip={hint} /> : null}
    </div>
  );
}

function HintTipInline({ tip }: { tip: string }) {
  return <Tooltip title={tip}><span className="agent-kb-hint">?</span></Tooltip>;
}
