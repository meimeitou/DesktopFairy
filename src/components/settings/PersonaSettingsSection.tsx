import type { AppSettings } from "../../shared/settings";

interface Props {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

export default function PersonaSettingsSection({ settings, onChange }: Props) {
  return (
    <section className="settings-section">
      <h3>人设</h3>
      <p className="persona-desc">
        设定 AI 的角色与说话风格，会作为 System Prompt 注入每次对话。
      </p>
      <div className="field">
        <label>System Prompt</label>
        <textarea
          className="persona-textarea"
          rows={8}
          value={settings.systemPrompt}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          placeholder="你是一位可爱的桌面伙伴，回答简洁、自然、有温度。"
        />
      </div>
    </section>
  );
}
