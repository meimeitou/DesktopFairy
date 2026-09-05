import { useEffect, useState } from "react";
import RadioGroup from "../RadioGroup";
import Checkbox from "../Checkbox";
import HintTip, { FieldHead } from "../HintTip";
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
  hookLoadError?: string | null;
  hookStarted?: boolean;
  selectionTriggerMode?: string;
  tipVisible?: boolean;
  tipLoaded?: boolean;
  lastSkipReason?: string | null;
  lastProgramName?: string | null;
  lastSelectionFiredAt?: number | null;
  lastMouseEventAt?: number | null;
  lastTipError?: string | null;
  nativeMacTrusted?: boolean | null;
  execPath?: string;
  packaged?: boolean;
  grantTargetHint?: string;
  userDataPath?: string;
  settingsPath?: string;
}

interface Props {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

export default function SelectionSettingsSection({
  settings,
  onChange,
}: Props) {
  const [accessibility, setAccessibility] =
    useState<AccessibilityStatus | null>(null);

  const refreshAccessibility = () =>
    api
      .invoke("selection:check_accessibility")
      .then((status) => setAccessibility(status as AccessibilityStatus))
      .catch(() => setAccessibility(null));

  useEffect(() => {
    refreshAccessibility();
  }, [settings.selectionTriggerMode, settings.selectionEnabled]);

  useEffect(() => {
    if (!settings.selectionEnabled || accessibility?.trusted !== false)
      return undefined;
    const timer = window.setInterval(() => {
      api
        .invoke("selection:retry_hook")
        .then(() => refreshAccessibility())
        .catch(() => {});
    }, 2500);
    return () => window.clearInterval(timer);
  }, [settings.selectionEnabled, accessibility?.trusted]);

  const updateAction = (id: string, patch: Partial<SelectionActionItem>) => {
    const next = settings.selectionActions.map((a) =>
      a.id === id ? { ...a, ...patch } : a,
    );
    onChange({ selectionActions: next });
  };

  const resetActions = () => {
    onChange({
      selectionActions: DEFAULT_SELECTION_ACTIONS.map((a) => ({ ...a })),
    });
  };

  const isAutoMode = settings.selectionTriggerMode === "auto";
  const needsAccessibility =
    settings.selectionEnabled &&
    accessibility?.supported &&
    !accessibility?.trusted;
  const hookMissing =
    settings.selectionEnabled &&
    accessibility?.supported &&
    accessibility?.hookAvailable === false;
  const hookLoadFailed =
    settings.selectionEnabled &&
    accessibility?.supported &&
    accessibility?.hookAvailable === false &&
    accessibility?.hookLoadError;

  const setTriggerMode = (mode: SelectionTriggerMode) => {
    onChange({ selectionTriggerMode: mode });
  };

  return (
    <section className="settings-section selection-settings">
      <div className="field">
        <FieldHead hint="快捷键：选中后再按快捷键弹出。自动：选中后直接弹出（本应用对话窗口内不会触发）。">
          触发方式
        </FieldHead>
        <RadioGroup
          name="selectionTriggerMode"
          layout="inline"
          ariaLabel="划词触发方式"
          disabled={!settings.selectionEnabled}
          value={settings.selectionTriggerMode === "auto" ? "auto" : "shortcut"}
          options={[
            { value: "shortcut", label: "快捷键" },
            { value: "auto", label: "选中后自动弹出" },
          ]}
          onChange={(mode) => setTriggerMode(mode)}
        />

        {needsAccessibility && (
          <div className="selection-accessibility-hint">
            <p>
              需要辅助功能权限才能读取选中文本。若已开启仍无效，删掉列表里的
              DesktopFairy / Electron 后重新勾选应用，再完全退出后打开。
            </p>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                api.invoke("selection:prompt_accessibility").then(() => {
                  setTimeout(refreshAccessibility, 500);
                });
              }}
            >
              打开辅助功能设置
            </button>
          </div>
        )}
        {hookMissing && (
          <div className="selection-accessibility-hint">
            <p>
              划词模块未加载
              {hookLoadFailed ? `（${accessibility?.hookLoadError}）` : ""}
              ，请重新安装应用。
            </p>
          </div>
        )}
        {isAutoMode &&
          accessibility?.trusted &&
          accessibility?.hookStarted &&
          accessibility?.lastSelectionFiredAt == null && (
            <div className="selection-accessibility-hint">
              <p>
                {accessibility.lastMouseEventAt == null
                  ? "没收到鼠标事件，多半是辅助功能授权失效。关掉再打开 DesktopFairy 的权限，然后完全退出应用再打开。"
                  : "已收到鼠标，但没识别到划词。试着在文本里拖选，或双击选词。"}
              </p>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  api.invoke("selection:prompt_accessibility").then(() => {
                    setTimeout(refreshAccessibility, 500);
                  });
                }}
              >
                打开辅助功能设置
              </button>
            </div>
          )}
      </div>

      <div className="selection-toggle-row">
        <span>选中后自动发送</span>
        <HintTip tip="点工具栏动作后，直接把内容发到对话。" />
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.selectionAutoSend}
            onChange={(e) => onChange({ selectionAutoSend: e.target.checked })}
            disabled={!settings.selectionEnabled}
            aria-label="选中后自动发送"
          />
          <span className="toggle-track" />
        </label>
      </div>

      <div className="field">
        <FieldHead
          htmlFor="selection-max-length"
          hint="超过这个字数不弹出工具栏。"
        >
          最大选词长度
        </FieldHead>
        <input
          id="selection-max-length"
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
        <FieldHead
          htmlFor="selection-search-engine"
          hint="格式：名称|URL，用 {{queryString}} 作为搜索词。"
        >
          搜索引擎
        </FieldHead>
        <input
          id="selection-search-engine"
          type="text"
          value={settings.searchEngine}
          onChange={(e) => onChange({ searchEngine: e.target.value })}
          placeholder="Google|https://www.google.com/search?q={{queryString}}"
          disabled={!settings.selectionEnabled}
        />
      </div>

      <div className="field">
        <div className="selection-actions-header">
          <FieldHead hint="工具栏上显示的动作。可改名称对应的提示词，或单独覆盖搜索引擎。">
            工具栏动作
          </FieldHead>
          <button type="button" className="btn-ghost" onClick={resetActions}>
            恢复默认
          </button>
        </div>
        <ul className="selection-actions-list">
          {settings.selectionActions.map((action) => (
            <li key={action.id} className="selection-action-row">
              <Checkbox
                className="selection-action-toggle"
                checked={action.enabled}
                disabled={!settings.selectionEnabled}
                onChange={(enabled) => updateAction(action.id, { enabled })}
                label={
                  <>
                    {action.icon} {action.name}
                  </>
                }
              />
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
