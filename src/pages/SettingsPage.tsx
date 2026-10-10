import { Button, Icon, Switch } from "animal-island-ui";
import { InfoIcon, KeyboardIcon } from "../components/icons/naivePatch";
import { useState, useEffect } from "react";
import ProviderSettingsSection from "../components/settings/ProviderSettingsSection";
import AgentSettingsSection from "../components/settings/agent/AgentSettingsSection";
import SelectionSettingsSection from "../components/settings/SelectionSettingsSection";
import Live2DSettingsSection from "../components/settings/Live2DSettingsSection";
import WebSearchSettingsSection from "../components/settings/WebSearchSettingsSection";
import ShortcutSettingsSection from "../components/settings/ShortcutSettingsSection";
import FileProcessingSettingsSection from "../components/settings/FileProcessingSettingsSection";
import ToolsSettingsSection from "../components/settings/tools/ToolsSettingsSection";
import type { AppSettings } from "../shared/settings";
import {
  setSettings,
  useSettings,
  useSettingsPersistError,
} from "../shared/settingsStore";
import "./SettingsPage.css";

const api = window.electronAPI;

type SettingsTab =
  | "model"
  | "agent"
  | "tools"
  | "websearch"
  | "fileProcessing"
  | "selection"
  | "character"
  | "shortcut"
  | "about";

interface MenuItem {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
}

const MENU_PRIMARY: MenuItem[] = [
  { id: "model", label: "AI 模型", icon: <Icon name="Cloud" size={16} /> },
  { id: "agent", label: "智能体", icon: <Icon name="Star" size={16} /> },
  { id: "tools", label: "工具", icon: <Icon name="Settings" size={16} /> },
  { id: "websearch", label: "网络搜索", icon: <Icon name="Globe" size={16} /> },
  { id: "fileProcessing", label: "文档处理", icon: <Icon name="File" size={16} /> },
  { id: "selection", label: "划词助手", icon: <Icon name="Pencil" size={16} /> },
];

const MENU_SECONDARY: MenuItem[] = [
  { id: "character", label: "Live2D 配置", icon: <Icon name="Cat" size={16} /> },
  { id: "shortcut", label: "快捷键", icon: <Icon icon={KeyboardIcon} size={16} /> },
  { id: "about", label: "关于", icon: <Icon icon={InfoIcon} size={16} /> },
];

const TAB_META: Record<SettingsTab, { title: string; desc: string }> = {
  model: { title: "AI 模型", desc: "配置模型服务商、API 密钥与可用模型" },
  agent: { title: "智能体", desc: "定义人格、技能、工具与执行策略" },
  tools: { title: "工具", desc: "管理 MCP 服务器与技能库" },
  websearch: { title: "网络搜索", desc: "让智能体在回答时检索网络资料" },
  fileProcessing: { title: "文档处理", desc: "选择处理器并配置凭证" },
  selection: { title: "划词助手", desc: "选中文本后弹出的快捷操作工具栏" },
  character: { title: "Live2D 配置", desc: "桌宠模型、窗口尺寸与表现" },
  shortcut: { title: "快捷键", desc: "全局唤起应用的按键" },
  about: { title: "关于", desc: "版本与开发进度" },
};

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
    <Button
      key={item.id}
      type="text"
      className={`settings-menu-item${active === item.id ? " active" : ""}`}
      onClick={() => onSelect(item.id)}
    >
      <span className="settings-menu-icon">{item.icon}</span>
      <span className="settings-menu-label">{item.label}</span>
    </Button>
  );

  return (
    <aside className="settings-sidebar">
      <nav className="settings-menu">
        <span className="settings-menu-group-label">功能</span>
        {MENU_PRIMARY.map(renderItem)}
        <span className="settings-menu-group-label">系统</span>
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
  const settings = useSettings();
  const persistError = useSettingsPersistError();
  const [activeTab, setActiveTab] = useState<SettingsTab>("model");

  useEffect(() => {
    (async () => {
      const [selectionShortcut, chatShortcut] = await Promise.all([
        api.getShortcut(),
        api.getChatShortcut(),
      ]);
      setSettings((prev) => ({
        ...prev,
        selectionShortcut: selectionShortcut || prev.selectionShortcut,
        chatShortcut: chatShortcut || prev.chatShortcut,
      }));
    })();
  }, []);

  const commitSettings = (
    next: AppSettings | ((prev: AppSettings) => AppSettings),
  ) => {
    setSettings(next);
  };

  const update = (patch: Partial<AppSettings>) =>
    commitSettings((prev) => ({ ...prev, ...patch }));

  /** Functional updater — avoids stale merges when patching nested agent fields. */
  const updateSettings = (fn: (prev: AppSettings) => AppSettings) =>
    commitSettings(fn);

  const renderContent = () => {
    switch (activeTab) {
      case "model":
        return (
          <ProviderSettingsSection
            settings={settings}
            onChange={commitSettings}
          />
        );
      case "agent":
        return <AgentSettingsSection settings={settings} onChange={updateSettings} />;
      case "tools":
        return <ToolsSettingsSection settings={settings} onChange={updateSettings} />;
      case "websearch":
        return (
          <WebSearchSettingsSection settings={settings} onChange={update} />
        );
      case "fileProcessing":
        return (
          <FileProcessingSettingsSection settings={settings} onChange={update} />
        );
      case "selection":
        return (
          <SelectionSettingsSection settings={settings} onChange={update} />
        );
      case "character":
        return <Live2DSettingsSection settings={settings} onChange={update} />;
      case "shortcut":
        return <ShortcutSettingsSection settings={settings} onChange={update} />;
      case "about":
        return (
          <section className="settings-section about-section">
            <div className="about-version-row">
              <span className="about-version-name">DesktopFairy</span>
              <span className="about-version-tag">v0.3.0</span>
            </div>
            <ul className="about-roadmap">
              <li className="done">UI 与基础功能</li>
              <li className="done">Live2D 支持</li>
              <li className="done">网络搜索</li>
              <li className="done">划词助手</li>
              <li className="done">快捷键</li>
              <li className="done">智能体</li>
              <li className="done">AI 模型</li>
              <li className="done">知识库</li>
            </ul>
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
        <header className="settings-page-header">
          <div className="settings-page-title-row">
            <h1 className="settings-page-title">{TAB_META[activeTab].title}</h1>
            {activeTab === "selection" && (
              <Switch
                checked={settings.selectionEnabled}
                onChange={(checked) => update({ selectionEnabled: checked })}
                aria-label="启用划词助手"
              />
            )}
          </div>
          <p className="settings-page-desc">{TAB_META[activeTab].desc}</p>
        </header>
        {persistError && (
          <div className="settings-persist-error" role="alert">
            设置未保存到磁盘：{persistError}（重启后可能丢失）
          </div>
        )}
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
        <Button
          type="text"
          size="small"
          className="icon-btn close-btn"
          icon={<Icon name="Close" size={14} />}
          onClick={onClose ?? (() => window.close())}
          title="关闭"
        />
      </div>
      {layout}
    </div>
  );
}
