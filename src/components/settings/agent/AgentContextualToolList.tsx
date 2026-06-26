interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  badge?: string;
}

interface ContextToggle {
  key: string;
  label: string;
  enabledIds: Set<string>;
  forcedOffIds?: Set<string>;
  onToggle: (id: string, enabled: boolean) => void;
}

interface Props {
  items: CatalogItem[];
  contexts: ContextToggle[];
  search?: string;
  emptyLabel?: string;
}

export default function AgentContextualToolList({
  items,
  contexts,
  search = "",
  emptyLabel = "暂无项目",
}: Props) {
  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      )
    : items;

  if (filtered.length === 0) {
    return <p className="agent-catalog-empty">{emptyLabel}</p>;
  }

  return (
    <ul className="agent-contextual-tool-list">
      <li className="agent-contextual-tool-header">
        <span className="agent-contextual-tool-name">工具</span>
        <div className="agent-contextual-tool-contexts">
          {contexts.map((ctx) => (
            <span key={ctx.key} className="agent-contextual-tool-context-label">
              {ctx.label}
            </span>
          ))}
        </div>
      </li>
      {filtered.map((item) => (
        <li key={item.id} className="agent-contextual-tool-item">
          <div className="agent-contextual-tool-main">
            <div className="agent-contextual-tool-title-row">
              <strong>{item.name}</strong>
              {item.badge && (
                <span className="agent-tool-auto-badge">{item.badge}</span>
              )}
            </div>
            {item.description && <p>{item.description}</p>}
          </div>
          <div className="agent-contextual-tool-contexts">
            {contexts.map((ctx) => {
              const enabled = ctx.enabledIds.has(item.id);
              const forcedOff = ctx.forcedOffIds?.has(item.id);
              return (
                <div
                  key={ctx.key}
                  className="agent-contextual-tool-toggle-cell"
                  title={
                    forcedOff
                      ? "此场景下不可用"
                      : enabled
                        ? "禁用"
                        : "启用"
                  }
                >
                  <label
                    className={`toggle agent-toggle-switch agent-contextual-tool-toggle${
                      forcedOff ? " forced-off" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={forcedOff}
                      onChange={(e) =>
                        !forcedOff && ctx.onToggle(item.id, e.target.checked)
                      }
                    />
                    <span className="toggle-track" />
                  </label>
                </div>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}
