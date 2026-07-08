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
  const [now, setNow] = useState(() => Date.now());

  const refreshAccessibility = () =>
    api
      .invoke("selection:check_accessibility")
      .then((status) => setAccessibility(status as AccessibilityStatus))
      .catch(() => setAccessibility(null));

  useEffect(() => {
    refreshAccessibility();
  }, [settings.selectionTriggerMode, settings.selectionEnabled]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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

  const enabledCount = settings.selectionActions.filter(
    (a) => a.enabled,
  ).length;
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
    <section className="settings-section">
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
            ? "选中文字后自动显示工具栏（本应用对话窗口内划词不会触发）"
            : "选中文字后按快捷键显示工具栏"}
        </p>
        {settings.selectionEnabled && accessibility?.supported && (
          <p className="about-text secondary selection-diagnostics">
            辅助功能：{accessibility.trusted ? "已授权" : "未授权"}
            {accessibility.nativeMacTrusted != null && (
              <> (native:{accessibility.nativeMacTrusted ? "✓" : "✗"})</>
            )}
            {" · "}
            划词模块：{accessibility.hookStarted ? "运行中" : "未启动"}
            {" · "}
            模式：
            {accessibility.selectionTriggerMode ||
              settings.selectionTriggerMode}
            {accessibility.packaged ? " · 安装版" : " · 开发模式"}
            {" · 鼠标："}
            {accessibility.lastMouseEventAt == null
              ? "无"
              : `${Math.round((now - accessibility.lastMouseEventAt) / 1000)}s前`}
            {" · 事件："}
            {accessibility.lastSelectionFiredAt == null
              ? "从未触发"
              : `${Math.round((now - accessibility.lastSelectionFiredAt) / 1000)}秒前`}
            {accessibility.lastSkipReason != null && (
              <>
                {" · 上次跳过："}
                <code style={{ fontSize: "0.85em" }}>
                  {accessibility.lastSkipReason}
                </code>
              </>
            )}
            {accessibility.lastTipError != null && (
              <>
                {" · tip错误："}
                <code style={{ fontSize: "0.85em" }}>
                  {accessibility.lastTipError}
                </code>
              </>
            )}
          </p>
        )}

        {needsAccessibility && (
          <div className="selection-accessibility-hint">
            <p className="about-text secondary">
              macOS 需要「辅助功能」权限才能读取选中文本
              {isAutoMode ? "（自动模式）" : "（快捷键模式同样必需）"}。
              {accessibility?.packaged ? (
                <>
                  {" "}
                  安装版与 make dev 是不同进程：开发模式授权的是
                  Electron，不会自动作用于 DMG 安装版。
                </>
              ) : null}
              若系统设置里已显示开启但仍提示未授权，请删除列表中所有
              DesktopFairy / Electron 条目后重新勾选{" "}
              <code>
                {accessibility?.grantTargetHint ||
                  "/Applications/DesktopFairy.app"}
              </code>
              （不要勾选 Application Support
              下的条目）；授权后完全退出并重新打开应用。
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
              打开辅助功能设置
            </button>
          </div>
        )}
        {hookMissing && (
          <div className="selection-accessibility-hint">
            <p className="about-text secondary">
              划词原生模块未加载
              {hookLoadFailed ? `（${accessibility?.hookLoadError}）` : ""}
              ，请重新安装应用或联系开发者。
            </p>
          </div>
        )}
        {isAutoMode &&
          accessibility?.trusted &&
          accessibility?.hookStarted &&
          accessibility?.lastSelectionFiredAt == null && (
            <div className="selection-accessibility-hint">
              <p className="about-text secondary">
                {accessibility.lastMouseEventAt == null ? (
                  <>
                    <strong>CGEventTap 未收到鼠标事件。</strong>
                    这通常是辅助功能授权失效导致的。请前往「系统设置 →
                    隐私与安全性 → 辅助功能」，将 DesktopFairy
                    的开关关闭后重新打开，然后完全退出并重启应用。
                  </>
                ) : (
                  <>
                    <strong>鼠标事件正常，但未识别到划词手势。</strong>
                    可能是光标类型检测失败（macOS
                    版本兼容问题）。请尝试：在文本框内缓慢拖动选择文字（确保光标为
                    I 形），或双击选词。
                  </>
                )}
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
                打开辅助功能设置
              </button>
            </div>
          )}
      </div>

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

      <div className="settings-subsection">
        <p className="settings-subsection-title">自定义动作</p>
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
      </div>
    </section>
  );
}
