import { useEffect, useState } from "react";
import {
  DEFAULT_SELECTION_ACTIONS,
  type SelectionActionItem,
} from "../../shared/selectionActions";
import {
  normalizeSelectionMaxLength,
  type AppSettings,
  type SelectionTriggerMode,
} from "../../shared/settings";

const api = window.electronAPI;

interface AccessibilityStatus {
  supported: boolean;
  trusted: boolean;
  hookAvailable: boolean;
}

interface Props {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

export default function SelectionSettingsSection({
  settings,
  onChange,
}: Props) {
  const [accessibility, setAccessibility] = useState<AccessibilityStatus | null>(
    null
  );

  const refreshAccessibility = () => {
    api
      .invoke("selection:check_accessibility")
      .then((status) => setAccessibility(status as AccessibilityStatus))
      .catch(() => setAccessibility(null));
  };

  useEffect(() => {
    refreshAccessibility();
  }, [settings.selectionTriggerMode]);

  const updateAction = (id: string, patch: Partial<SelectionActionItem>) => {
    const next = settings.selectionActions.map((a) =>
      a.id === id ? { ...a, ...patch } : a
    );
    onChange({ selectionActions: next });
  };

  const resetActions = () => {
    onChange({
      selectionActions: DEFAULT_SELECTION_ACTIONS.map((a) => ({ ...a })),
    });
  };

  const enabledCount = settings.selectionActions.filter((a) => a.enabled).length;
  const isAutoMode = settings.selectionTriggerMode === "auto";
  const needsAccessibility =
    isAutoMode && accessibility?.supported && !accessibility?.trusted;

  const setTriggerMode = (mode: SelectionTriggerMode) => {
    onChange({ selectionTriggerMode: mode });
  };

  return (
    <section className="settings-section">
      <h3>划词助手</h3>
      <div className="field field-row">
        <label>启用划词助手</label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.selectionEnabled}
            onChange={(e) => onChange({ selectionEnabled: e.target.checked })}
          />
          <span className="toggle-track" />
        </label>
      </div>

      <div className="field">
        <label>触发方式</label>
        <div className="provider-presets">
          <button
            type="button"
            className={`provider-preset-btn${!isAutoMode ? " active" : ""}`}
            onClick={() => setTriggerMode("shortcut")}
            disabled={!settings.selectionEnabled}
          >
            快捷键
          </button>
          <button
            type="button"
            className={`provider-preset-btn${isAutoMode ? " active" : ""}`}
            onClick={() => setTriggerMode("auto")}
            disabled={!settings.selectionEnabled}
          >
            选中后自动弹出
          </button>
        </div>
        <p className="about-text secondary">
          {isAutoMode
            ? "选中文字后自动显示工具栏（macOS 需开启辅助功能权限）"
            : "选中文字后按快捷键显示工具栏"}
        </p>
        {needsAccessibility && (
          <div className="selection-accessibility-hint">
            <p className="about-text secondary">
              自动弹出模式需要「辅助功能」权限才能监听选词。
            </p>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                api.invoke("selection:prompt_accessibility").then(() => {
                  setTimeout(refreshAccessibility, 500);
                });
              }}
            >
              打开系统设置授权
            </button>
          </div>
        )}
      </div>

      {!isAutoMode && (
        <div className="field">
          <label>触发快捷键</label>
          <input
            type="text"
            value={settings.selectionShortcut}
            onChange={(e) => onChange({ selectionShortcut: e.target.value })}
            onBlur={async () => {
              const ok = await api.setShortcut(settings.selectionShortcut);
              if (!ok) alert("快捷键注册失败，可能已被占用");
            }}
            placeholder="Command+Shift+C"
            disabled={!settings.selectionEnabled}
          />
        </div>
      )}

      <div className="field field-row">
        <label>选中后自动发送</label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.selectionAutoSend}
            onChange={(e) => onChange({ selectionAutoSend: e.target.checked })}
            disabled={!settings.selectionEnabled}
          />
          <span className="toggle-track" />
        </label>
      </div>
      <div className="field">
        <label>最大选词长度</label>
        <input
          type="number"
          min={50}
          max={5000}
          value={normalizeSelectionMaxLength(settings.selectionMaxLength)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return;
            onChange({
              selectionMaxLength: normalizeSelectionMaxLength(raw),
            });
          }}
          onBlur={(e) => {
            onChange({
              selectionMaxLength: normalizeSelectionMaxLength(e.target.value),
            });
          }}
          placeholder="500"
          disabled={!settings.selectionEnabled}
        />
      </div>
      <div className="field">
        <label>搜索引擎</label>
        <input
          type="text"
          value={settings.searchEngine}
          onChange={(e) => onChange({ searchEngine: e.target.value })}
          placeholder="Google|https://www.google.com/search?q={{queryString}}"
          disabled={!settings.selectionEnabled}
        />
        <p className="about-text secondary">
          格式：名称|URL，用 {"{{queryString}}"} 作为搜索词占位符
        </p>
      </div>
      <div className="field">
        <div className="selection-actions-header">
          <label>工具栏动作（{enabledCount} 个已启用）</label>
          <button type="button" className="link-btn" onClick={resetActions}>
            恢复默认
          </button>
        </div>
        <div className="selection-actions-demo">
          {settings.selectionActions
            .filter((a) => a.enabled)
            .map((a) => (
              <span key={a.id} className="selection-action-chip">
                {a.icon} {a.name}
              </span>
            ))}
        </div>
        <ul className="selection-actions-list">
          {settings.selectionActions.map((action) => (
            <li key={action.id} className="selection-action-row">
              <label className="selection-action-toggle">
                <input
                  type="checkbox"
                  checked={action.enabled}
                  onChange={(e) =>
                    updateAction(action.id, { enabled: e.target.checked })
                  }
                  disabled={!settings.selectionEnabled}
                />
                <span>
                  {action.icon} {action.name}
                </span>
              </label>
              {action.id === "search" ? (
                <input
                  type="text"
                  className="selection-action-extra"
                  value={action.searchEngine || settings.searchEngine}
                  onChange={(e) =>
                    updateAction(action.id, { searchEngine: e.target.value })
                  }
                  placeholder="搜索引擎 URL"
                  disabled={!settings.selectionEnabled || !action.enabled}
                />
              ) : action.prompt !== undefined ? (
                <input
                  type="text"
                  className="selection-action-extra"
                  value={action.prompt}
                  onChange={(e) =>
                    updateAction(action.id, { prompt: e.target.value })
                  }
                  placeholder="Prompt（{{text}}）"
                  disabled={!settings.selectionEnabled || !action.enabled}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
