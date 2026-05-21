import { useState, useEffect } from "react";
import "./SettingsPage.css";

const api = window.electronAPI;

const SIZE_MAP = {
  small: { width: 280, height: 320 },
  medium: { width: 380, height: 400 },
  large: { width: 480, height: 500 },
};

interface Settings {
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  ttsEnabled: boolean;
  modelPath: string;
  windowSize: "small" | "medium" | "large";
}

const DEFAULT_SETTINGS: Settings = {
  apiBaseUrl: "https://api.openai.com/v1",
  apiKey: "",
  modelName: "gpt-4o-mini",
  ttsEnabled: false,
  modelPath: "/models/Hiyori/Hiyori.model3.json",
  windowSize: "medium",
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem("da_settings");
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface Props {
  onClose: () => void;
  /** When true, renders without the custom window-frame (used in standalone window) */
  standalone?: boolean;
}

export default function SettingsPage({ onClose, standalone = false }: Props) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    localStorage.setItem("da_settings", JSON.stringify(settings));
  }, [settings]);

  const update = (patch: Partial<Settings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  const body = (
    <div className="settings-body">
      <section className="settings-section">
        <h3>AI 模型</h3>
        <div className="field">
          <label>API Base URL</label>
          <input
            type="text"
            value={settings.apiBaseUrl}
            onChange={(e) => update({ apiBaseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1"
          />
        </div>
        <div className="field">
          <label>API Key</label>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) => update({ apiKey: e.target.value })}
            placeholder="sk-..."
          />
        </div>
        <div className="field">
          <label>模型</label>
          <input
            type="text"
            value={settings.modelName}
            onChange={(e) => update({ modelName: e.target.value })}
            placeholder="gpt-4o-mini"
          />
        </div>
      </section>

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

      <section className="settings-section">
        <h3>Live2D 角色</h3>
        <div className="field">
          <label>模型路径</label>
          <input
            type="text"
            value={settings.modelPath}
            onChange={(e) => update({ modelPath: e.target.value })}
            placeholder="/models/MyModel/MyModel.model3.json"
          />
        </div>
        <div className="field">
          <label>窗口大小</label>
          <select
            value={settings.windowSize}
            onChange={(e) => {
              const val = e.target.value as Settings["windowSize"];
              update({ windowSize: val });
              const size = SIZE_MAP[val] ?? SIZE_MAP.medium;
              api.invoke("resize_main_window", {
                width: size.width,
                height: size.height,
              });
            }}
          >
            <option value="small">小 (280 × 320)</option>
            <option value="medium">中 (380 × 400)</option>
            <option value="large">大 (480 × 500)</option>
          </select>
        </div>
        <p className="about-text secondary">
          将模型文件夹放入 public/models/，填写相对路径
        </p>
      </section>

      <section className="settings-section">
        <h3>关于</h3>
        <p className="about-text">DesktopFairy v0.1.0</p>
        <p className="about-text secondary">阶段一：桌面壳与基础 UI ✓</p>
        <p className="about-text secondary">阶段二：Live2D SDK 接入 ✓</p>
      </section>
    </div>
  );

  if (standalone) {
    return <div className="settings-standalone">{body}</div>;
  }

  return (
    <div className="window-frame settings-frame">
      <div className="title-bar" data-tauri-drag-region>
        <span className="app-name" data-tauri-drag-region>
          设置
        </span>
        <button className="icon-btn close-btn" onClick={onClose} title="关闭">
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
      {body}
    </div>
  );
}
