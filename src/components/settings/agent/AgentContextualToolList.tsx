import { Switch } from "animal-island-ui";

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
  /** Shown as ON even when not in enabledIds (e.g. mode-gated at runtime). */
  forcedOnIds?: Set<string>;
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
              const forcedOn = !enabled && (ctx.forcedOnIds?.has(item.id) ?? false);
              const shown = enabled || forcedOn;
              const title = forcedOff
                ? "此场景下不可用"
                : forcedOn
                  ? "默认开启；全自动模式下运行时自动停用"
                  : shown
                    ? "禁用"
                    : "启用";
              return (
                <div
                  key={ctx.key}
                  className="agent-contextual-tool-toggle-cell"
                  title={title}
                >
                  <Switch
                    checked={shown}
                    disabled={forcedOff || forcedOn}
                    onChange={(checked) =>
                      !forcedOff && ctx.onToggle(item.id, checked)
                    }
                    aria-label={title}
                  />
                </div>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}
