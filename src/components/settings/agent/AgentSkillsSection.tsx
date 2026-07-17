import { useCallback, useEffect, useMemo, useState } from "react";
import type { AgentConfig, AgentSkillDescriptor } from "../../../shared/agent";
import AgentCatalogToggleList from "./AgentCatalogToggleList";

const api = window.electronAPI;

interface Props {
  agent: AgentConfig;
  onChange: (patch: Partial<AgentConfig>) => void;
}

export default function AgentSkillsSection({ agent, onChange }: Props) {
  const [skills, setSkills] = useState<AgentSkillDescriptor[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [skillImportError, setSkillImportError] = useState<string | null>(null);
  const [importingSkill, setImportingSkill] = useState(false);
  const [search, setSearch] = useState("");

  const enabledSkillIds = useMemo(
    () => new Set(agent.enabledSkillIds),
    [agent.enabledSkillIds]
  );

  const loadSkills = useCallback(async () => {
    setLoadingSkills(true);
    try {
      const list = (await api.invoke("agent:skills:scan")) as AgentSkillDescriptor[];
      setSkills(Array.isArray(list) ? list : []);
    } catch {
      setSkills([]);
    } finally {
      setLoadingSkills(false);
    }
  }, []);

  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

  const toggleSkill = (id: string, enabled: boolean) => {
    if (enabled) {
      if (agent.enabledSkillIds.includes(id)) return;
      onChange({ enabledSkillIds: [...agent.enabledSkillIds, id] });
    } else {
      onChange({
        enabledSkillIds: agent.enabledSkillIds.filter((x) => x !== id),
      });
    }
  };

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
        const { id } = result.skill;
        if (!agent.enabledSkillIds.includes(id)) {
          onChange({ enabledSkillIds: [...agent.enabledSkillIds, id] });
        }
        await loadSkills();
      }
    } catch (e) {
      setSkillImportError(e instanceof Error ? e.message : String(e));
    } finally {
      setImportingSkill(false);
    }
  };

  const skillItems = skills.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description || s.folderName,
    badge: s.isBuiltin ? "内置" : undefined,
  }));

  return (
    <section className="settings-section agent-subsection">
      <h4>技能</h4>
      <p className="agent-subsection-intro">
        启用后通过 <code>Skill</code> / <code>Skills</code> 按需加载与管理。可导入含{" "}
        <code>SKILL.md</code> 的本地文件夹，或直接编辑{" "}
        <code>~/.agents/skills/</code>。
      </p>

      <div className="agent-skills-toolbar">
        <button
          type="button"
          className="btn-secondary"
          disabled={importingSkill}
          onClick={() => void importLocalSkill()}
        >
          {importingSkill ? "导入中…" : "导入本地技能"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => void openSkillsDir()}
        >
          打开目录
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => void loadSkills()}
        >
          刷新
        </button>
      </div>
      {skillImportError && (
        <p className="field-hint warn">{skillImportError}</p>
      )}

      <div className="field agent-tool-search">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索技能…"
        />
      </div>

      {loadingSkills ? (
        <p className="field-hint">正在扫描技能…</p>
      ) : (
        <AgentCatalogToggleList
          items={skillItems}
          enabledIds={enabledSkillIds}
          onToggle={toggleSkill}
          search={search}
          emptyLabel="暂无技能。可在 ~/.agents/skills/ 下添加 SKILL.md。"
        />
      )}
    </section>
  );
}
