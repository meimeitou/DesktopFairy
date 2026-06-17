interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  badge?: string;
}

interface Props {
  items: CatalogItem[];
  enabledIds: Set<string>;
  onToggle: (id: string, enabled: boolean) => void;
  search?: string;
  emptyLabel?: string;
}

export default function AgentCatalogToggleList({
  items,
  enabledIds,
  onToggle,
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
    <ul className="agent-toggle-list">
      {filtered.map((item) => {
        const enabled = enabledIds.has(item.id);
        return (
          <li key={item.id} className="agent-toggle-item">
            <div className="agent-toggle-main">
              <div className="agent-toggle-title-row">
                <strong>{item.name}</strong>
                {item.badge && (
                  <span className="agent-tool-auto-badge">{item.badge}</span>
                )}
              </div>
              {item.description && <p>{item.description}</p>}
            </div>
            <label className="toggle agent-toggle-switch" title={enabled ? "禁用" : "启用"}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => onToggle(item.id, e.target.checked)}
              />
              <span className="toggle-track" />
            </label>
          </li>
        );
      })}
    </ul>
  );
}
