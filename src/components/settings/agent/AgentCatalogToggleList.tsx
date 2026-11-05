import { Switch } from "@cherrystudio/ui";
import Select from "../../Select";

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
  defaultEnabledIds?: Set<string>;
  toolOverrides?: Record<string, boolean>;
  onPreference?: (id: string, value: string) => void;
  emptyLabel?: string;
  /** Ids force-disabled by context rules; switch hidden, no interaction. */
  forcedDisabledIds?: Set<string>;
  /** `list` = divided rows; `card` = cherry-style 2-col bordered grid. */
  layout?: "list" | "card";
}

export default function AgentCatalogToggleList({
  items,
  enabledIds,
  onToggle,
  search = "",
  emptyLabel = "暂无项目",
  forcedDisabledIds,
  defaultEnabledIds,
  toolOverrides,
  onPreference,
  layout = "list",
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
    <ul className={`agent-toggle-list agent-toggle-list-${layout}`}>
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
            {forcedDisabledIds?.has(item.id) ? (
              <span className="agent-tool-auto-badge">场景强制</span>
            ) : onPreference ? (
              <div className="agent-tool-preference">
                <Select aria-label={`${item.name} 工具偏好`}
                  value={toolOverrides?.[item.id] === true ? "on" : toolOverrides?.[item.id] === false ? "off" : "default"}
                  onChange={(value) => onPreference(item.id, value)}
                  options={[
                    { key: "default", label: `默认（${defaultEnabledIds?.has(item.id) ? "启用" : "关闭"}）` },
                    { key: "on", label: "启用" },
                    { key: "off", label: "禁用" },
                  ]}
                />
              </div>
            ) : (
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => onToggle(item.id, checked)}
                aria-label={enabled ? "禁用" : "启用"}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
