import { type AppSettings } from "../../shared/settings";

const api = window.electronAPI;

interface Props {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

export default function ShortcutSettingsSection({ settings, onChange }: Props) {
  const isAutoMode = settings.selectionTriggerMode === "auto";

  return (
    <section className="settings-section">
      <p className="settings-section-lead">
        全局快捷键，任何应用下按组合键即可触发。格式如 Command+R、Command+Shift+C、Alt+Space。
      </p>

      <div className="field">
        <label>显示/隐藏 伴侣</label>
        <input
          type="text"
          value={settings.chatShortcut}
          onChange={(e) => onChange({ chatShortcut: e.target.value })}
          onBlur={async () => {
            const ok = await api.setChatShortcut(settings.chatShortcut);
            if (!ok) alert("快捷键注册失败，可能已被占用");
          }}
          placeholder="Command+R"
        />
      </div>

      <div className="field">
        <label>划词触发{isAutoMode && "（自动模式下不生效）"}</label>
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
    </section>
  );
}
