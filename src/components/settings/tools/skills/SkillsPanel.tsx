import { Button, Input } from "animal-island-ui";
import { useCallback, useEffect, useState } from "react";
import HintTip from "../../../HintTip";
import type { AppSettings } from "../../../../shared/settings";
import type { AgentConfig, AgentSkillDescriptor } from "../../../../shared/agent";

const api = window.electronAPI;

interface Props {
  settings: AppSettings;
  onAgentChange: (patch: Partial<AgentConfig>) => void;
}

export default function SkillsPanel({ settings, onAgentChange }: Props) {
  const [skills, setSkills] = useState<AgentSkillDescriptor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [importingSkill, setImportingSkill] = useState(false);
  const [skillImportError, setSkillImportError] = useState<string | null>(null);
  const [removingSkill, setRemovingSkill] = useState<string | null>(null);


  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const list = (await api.invoke("agent:skills:scan")) as AgentSkillDescriptor[];
      const next = Array.isArray(list) ? list : [];
      setSkills(next);
      setLoaded(true);
    } catch {
      setSkills([]);
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Dangling-reference cleanup: drop enabledSkillIds whose folders vanished.
  const enabledIds = settings.agent.enabledSkillIds;
  useEffect(() => {
    if (!loaded) return;
    const ids = new Set(skills.map((s) => s.id));
    if (enabledIds.some((id) => !ids.has(id))) {
      onAgentChange({ enabledSkillIds: enabledIds.filter((id) => ids.has(id)) });
    }
  }, [skills, loaded, enabledIds, onAgentChange]);

  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

  const openSkillsDir = async () => {
    await api.invoke("agent:skills:open_dir");
    void loadSkills();
  };

  const importLocalSkill = async () => {
    setSkillImportError(null);
    setImportingSkill(true);
    try {
      const result = (await api.invoke("agent:skills:import_directory")) as
        | { canceled: true }
        | { skill: AgentSkillDescriptor }
        | { error: string };
      if ("canceled" in result && result.canceled) return;
      if ("error" in result && result.error) {
        setSkillImportError(result.error);
        return;
      }
      if ("skill" in result && result.skill?.id) {
        await loadSkills();
      }
    } catch (e) {
      setSkillImportError(e instanceof Error ? e.message : String(e));
    } finally {
      setImportingSkill(false);
    }
  };

  const removeSkill = async (id: string, name: string) => {
    if (!window.confirm(`确定卸载技能「${name}」？目录将被删除。`)) return;
    setRemovingSkill(id);
    try {
      await api.invoke("agent:skills:remove", { id });
      onAgentChange({
        enabledSkillIds: settings.agent.enabledSkillIds.filter((x) => x !== id),
      });
      void loadSkills();
    } catch (e) {
      setSkillImportError(e instanceof Error ? e.message : String(e));
    } finally {
      setRemovingSkill(null);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? skills.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q),
      )
    : skills;

  return (
    <section className="settings-section agent-subsection">
      <div className="agent-skills-toolbar">
        <div className="agent-skills-toolbar-actions">
          <Button
            type="primary"
            size="small"
            disabled={importingSkill}
            onClick={() => void importLocalSkill()}
          >
            {importingSkill ? "导入中…" : "导入本地技能"}
          </Button>
          <Button
            type="default"
            size="small"
            onClick={() => void openSkillsDir()}
          >
            打开目录
          </Button>
          <Button type="default" size="small" onClick={() => void loadSkills()}>
            刷新
          </Button>
        </div>
        <HintTip tip="技能库全局管理。是否注入智能体上下文请在「智能体 → 技能启用」中设置。内置技能受保护不可卸载。" />
      </div>
      {skillImportError && (
        <p className="field-hint field-hint--after warn">{skillImportError}</p>
      )}

      <div className="field agent-tool-search">
        <Input shadow type="search" value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索技能…"
        aria-label="搜索技能" />
      </div>

      {loading ? (
        <p className="agent-status-line">正在扫描技能…</p>
      ) : filtered.length === 0 ? (
        <p className="agent-catalog-empty">
          暂无技能。导入含 SKILL.md 的文件夹，或放到 ~/.agents/skills/。
        </p>
      ) : (
        <ul className="agent-toggle-list">
          {filtered.map((s) => (
            <li key={s.id} className="agent-toggle-item">
              <div className="agent-toggle-main">
                <div className="agent-toggle-title-row">
                  <strong>{s.name}</strong>
                  {s.isBuiltin && (
                    <span className="agent-tool-auto-badge">内置</span>
                  )}
                </div>
                <p>{s.description || s.folderName}</p>
              </div>
              {!s.isBuiltin && (
                <Button
                  type="default"
                  size="small"
                  danger
                  className="agent-catalog-remove"
                  disabled={removingSkill === s.id}
                  onClick={() => void removeSkill(s.id, s.name)}
                >
                  {removingSkill === s.id ? "卸载中…" : "卸载"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
