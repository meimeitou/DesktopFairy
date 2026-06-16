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
  icon: React.ReactNode;
}

function CloudIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
    </svg>
  );
}

function ScissorsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

function MaskIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7h-20v5z" />
      <path d="M6 11c1.5 0 3 .5 3 2-2 0-3 1-3 1" />
      <path d="M18 11c-1.5 0-3 .5-3 2 2 0 3 1 3 1" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

const MENU_PRIMARY: MenuItem[] = [
  { id: "model", label: "AI 模型", icon: <CloudIcon /> },
  { id: "persona", label: "人设", icon: <SparkleIcon /> },
  { id: "selection", label: "划词助手", icon: <ScissorsIcon /> },
];

const MENU_SECONDARY: MenuItem[] = [
  { id: "character", label: "Live2D 配置", icon: <MaskIcon /> },
  { id: "about", label: "关于", icon: <InfoIcon /> },
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
        return <PersonaSettingsSection settings={settings} onChange={update} />;
      case "selection":
        return (
          <SelectionSettingsSection settings={settings} onChange={update} />
        );
      case "character":
        return <Live2DSettingsSection settings={settings} onChange={update} />;
      case "about":
        return (
          <section className="settings-section">
            <h3>关于</h3>
            <p className="about-text">DesktopFairy v0.2.0</p>
            <p className="about-text secondary">阶段一：桌面壳与基础 UI ✓</p>
            <p className="about-text secondary">阶段二：Live2D SDK 接入 ✓</p>
            <p className="about-text secondary">
              阶段三：OpenAI 兼容流式对话 ✓
            </p>
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
        <div className="settings-content-body">
          <div className="settings-content-inner">{renderContent()}</div>
        </div>
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
        <button
          className="icon-btn close-btn"
          onClick={onClose ?? (() => window.close())}
          title="关闭"
        >
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
