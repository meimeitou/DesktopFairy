import { Input } from "animal-island-ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import HintTip from "../../HintTip";
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
  const [skillsLoaded, setSkillsLoaded] = useState(false);
  const [search, setSearch] = useState("");

  const enabledSkillIds = useMemo(
    () => new Set(agent.enabledSkillIds),
    [agent.enabledSkillIds]
  );


  const loadSkills = useCallback(async () => {
    setLoadingSkills(true);
    try {
      const list = (await api.invoke("agent:skills:scan")) as AgentSkillDescriptor[];
      const next = Array.isArray(list) ? list : [];
      setSkills(next);
      setSkillsLoaded(true);
    } catch {
      setSkills([]);
      setSkillsLoaded(false);
    } finally {
      setLoadingSkills(false);
    }
  }, []);

  // Dangling-reference cleanup: drop enabledSkillIds whose folders vanished.
  const enabledIds = agent.enabledSkillIds;
  useEffect(() => {
    if (!skillsLoaded) return;
    const ids = new Set(skills.map((s) => s.id));
    if (enabledIds.some((id) => !ids.has(id))) {
      onChange({ enabledSkillIds: enabledIds.filter((id) => ids.has(id)) });
    }
  }, [skills, skillsLoaded, enabledIds, onChange]);

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

  const skillItems = skills.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description || s.folderName,
    badge: s.isBuiltin ? "内置" : undefined,
  }));

  return (
    <section className="settings-section agent-subsection">
      <div className="agent-tool-search-row">
        <div className="field agent-tool-search">
          <Input shadow type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索技能…"
          aria-label="搜索技能" />
        </div>
        <HintTip tip="打开后，技能名称与简介会注入模型上下文，可通过 Skills 工具加载。关闭的技能不进上下文，只能用 /技能id 调用。技能的导入与卸载请在「设置 → 工具」中操作。" />
      </div>

      {loadingSkills ? (
        <p className="agent-status-line">正在扫描技能…</p>
      ) : (
        <AgentCatalogToggleList
          items={skillItems}
          enabledIds={enabledSkillIds}
          onToggle={toggleSkill}
          search={search}
          emptyLabel="暂无技能。请在「设置 → 工具」中导入，或放到 ~/.agents/skills/。"
        />
      )}
    </section>
  );
}
