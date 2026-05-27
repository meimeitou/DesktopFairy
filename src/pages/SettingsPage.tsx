import { useState, useEffect } from "react";
import ProviderSettingsSection from "../components/settings/ProviderSettingsSection";
import PersonaSettingsSection from "../components/settings/PersonaSettingsSection";
import SelectionSettingsSection from "../components/settings/SelectionSettingsSection";
import Live2DSettingsSection from "../components/settings/Live2DSettingsSection";
import {
  loadSettings,
  saveSettings,
  type AppSettings,
} from "../shared/settings";
import "./SettingsPage.css";

const api = window.electronAPI;

type SettingsTab = "model" | "persona" | "selection" | "character" | "about";

interface MenuItem {
  id: SettingsTab;
  label: string;
  icon: string;
}

const MENU_PRIMARY: MenuItem[] = [
  { id: "model", label: "AI 模型", icon: "☁️" },
  { id: "persona", label: "人设", icon: "✨" },
  { id: "selection", label: "划词助手", icon: "✂️" },
];

const MENU_SECONDARY: MenuItem[] = [
  { id: "character", label: "Live2D 配置", icon: "🎭" },
  { id: "about", label: "关于", icon: "ℹ️" },
];

interface Props {
  onClose?: () => void;
  standalone?: boolean;
  embedded?: boolean;
}

function SettingsSidebar({
  active,
  onSelect,
}: {
  active: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
}) {
  const renderItem = (item: MenuItem) => (
    <button
      key={item.id}
      type="button"
      className={`settings-menu-item${active === item.id ? " active" : ""}`}
      onClick={() => onSelect(item.id)}
    >
      <span className="settings-menu-icon">{item.icon}</span>
      <span className="settings-menu-label">{item.label}</span>
    </button>
  );

  return (
    <aside className="settings-sidebar">
      <div className="settings-sidebar-title">设置</div>
      <nav className="settings-menu">
        {MENU_PRIMARY.map(renderItem)}
        <div className="settings-menu-divider" />
        {MENU_SECONDARY.map(renderItem)}
      </nav>
    </aside>
  );
}

export default function SettingsPage({
  onClose,
  standalone = false,
  embedded = false,
}: Props) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [activeTab, setActiveTab] = useState<SettingsTab>("model");

  useEffect(() => {
    saveSettings(settings);
    api.invoke("settings:sync", settings).catch(() => {});
  }, [settings]);

  useEffect(() => {
    (async () => {
      const shortcut = await api.getShortcut();
      if (shortcut) {
        setSettings((prev) => ({ ...prev, selectionShortcut: shortcut }));
      }
    })();
  }, []);

  const update = (patch: Partial<AppSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  const renderContent = () => {
    switch (activeTab) {
      case "model":
        return (
          <>
            <ProviderSettingsSection
              settings={settings}
              onChange={setSettings}
            />
            <section className="settings-section">
              <h3>语音 (TTS)</h3>
              <div className="field field-row">
                <label>启用语音播报</label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.ttsEnabled}
                    onChange={(e) => update({ ttsEnabled: e.target.checked })}
                  />
                  <span className="toggle-track" />
                </label>
              </div>
            </section>
          </>
        );
      case "persona":
        return (
          <PersonaSettingsSection settings={settings} onChange={update} />
        );
      case "selection":
        return (
          <SelectionSettingsSection settings={settings} onChange={update} />
        );
      case "character":
        return (
          <Live2DSettingsSection settings={settings} onChange={update} />
        );
      case "about":
        return (
          <section className="settings-section">
            <h3>关于</h3>
            <p className="about-text">DesktopFairy v0.2.0</p>
            <p className="about-text secondary">阶段一：桌面壳与基础 UI ✓</p>
            <p className="about-text secondary">阶段二：Live2D SDK 接入 ✓</p>
            <p className="about-text secondary">阶段三：OpenAI 兼容流式对话 ✓</p>
          </section>
        );
      default:
        return null;
    }
  };

  const layout = (
    <div className="settings-layout">
      <SettingsSidebar active={activeTab} onSelect={setActiveTab} />
      <main className="settings-content">
        <div className="settings-content-body">{renderContent()}</div>
      </main>
    </div>
  );

  if (embedded) {
    return <div className="settings-embedded">{layout}</div>;
  }

  if (standalone) {
    return <div className="settings-standalone">{layout}</div>;
  }

  return (
    <div className="window-frame settings-frame">
      <div className="title-bar" data-tauri-drag-region>
        <span className="app-name" data-tauri-drag-region>
          设置
        </span>
        <button className="icon-btn close-btn" onClick={onClose ?? (() => window.close())} title="关闭">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      {layout}
    </div>
  );
}
