import { useCallback, useEffect, useMemo, useState } from "react";
import type { CodeCliId } from "../shared/codeCli";
import {
  normalizeCodeProjectsStore,
  type CodeCliToolState,
  type CodeProject,
  type CodeProjectsStore,
} from "../shared/codeProjects";
import CodeCliPanel from "../components/code/CodeCliPanel";
import ProjectEditDialog, {
  type ProjectEditMode,
} from "../components/code/ProjectEditDialog";
import ProjectSidebar from "../components/code/ProjectSidebar";
import "./CodePage.css";

const api = window.electronAPI;

export type CodePageAction =
  | "new-project"
  | "open-project"
  | "edit-project"
  | null;

interface Props {
  initialAction?: CodePageAction;
  onActionConsumed?: () => void;
}

export default function CodePage({
  initialAction = null,
  onActionConsumed,
}: Props) {
  const [store, setStore] = useState<CodeProjectsStore>(() =>
    normalizeCodeProjectsStore(null),
  );
  const [loading, setLoading] = useState(true);
  const [cliTool, setCliTool] = useState<CodeCliId>("claude-code");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<ProjectEditMode>("create");
  const [draftName, setDraftName] = useState("");
  const [draftPath, setDraftPath] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | undefined>();

  const refreshStore = useCallback(async () => {
    const data = (await api.invoke("project:list")) as CodeProjectsStore;
    setStore(normalizeCodeProjectsStore(data));
  }, []);

  useEffect(() => {
    void refreshStore().finally(() => setLoading(false));
  }, [refreshStore]);

  const activeProject = useMemo(
    () => store.projects.find((p) => p.id === store.activeProjectId) ?? null,
    [store],
  );

  const handleSelectProject = async (id: string) => {
    const result = (await api.invoke("project:set_active", { id })) as {
      store?: CodeProjectsStore;
    };
    if (result?.store) setStore(normalizeCodeProjectsStore(result.store));
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm("确定删除此项目？（不会删除磁盘上的文件）")) return;
    const result = (await api.invoke("project:delete", { id })) as {
      store?: CodeProjectsStore;
    };
    if (result?.store) setStore(normalizeCodeProjectsStore(result.store));
  };

  const openCreateDialog = (defaults?: { name?: string; path?: string }) => {
    setEditingProjectId(undefined);
    setDraftName(defaults?.name ?? "");
    setDraftPath(defaults?.path ?? "");
    setDraftDescription("");
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEditDialog = (project: CodeProject) => {
    setEditingProjectId(project.id);
    setDraftName(project.name);
    setDraftPath(project.path);
    setDraftDescription(project.description ?? "");
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const openPickProjectDialog = async () => {
    const pick = (await api.invoke("project:pick_directory")) as {
      ok?: boolean;
      canceled?: boolean;
      path?: string;
    };
    if (!pick?.ok || !pick.path) return;
    const name = pick.path.split(/[/\\]/).filter(Boolean).pop() || "项目";
    openCreateDialog({ name, path: pick.path });
  };

  useEffect(() => {
    if (!initialAction) return;
    if (initialAction === "new-project") openCreateDialog();
    else if (initialAction === "open-project") void openPickProjectDialog();
    else if (initialAction === "edit-project" && activeProject) openEditDialog(activeProject);
    onActionConsumed?.();
  }, [initialAction]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToolStateChange = async (toolId: CodeCliId, state: CodeCliToolState) => {
    const nextStore: CodeProjectsStore = {
      ...store,
      cliConfigs: { ...store.cliConfigs, [toolId]: state },
    };
    setStore(nextStore);
    await api.invoke("project:save_store", { store: nextStore });
  };

  if (loading) {
    return <div className="code-page code-page-loading">加载中…</div>;
  }

  return (
    <div className="code-page">
      <ProjectSidebar
        projects={store.projects}
        activeProjectId={store.activeProjectId}
        onSelect={(id) => void handleSelectProject(id)}
        onCreate={() => openCreateDialog()}
        onEdit={openEditDialog}
        onDelete={(id) => void handleDeleteProject(id)}
      />
      <CodeCliPanel
        project={activeProject}
        cliTool={cliTool}
        onCliToolChange={setCliTool}
        toolState={store.cliConfigs[cliTool]}
        onToolStateChange={(toolId, state) => void handleToolStateChange(toolId, state)}
      />
      <ProjectEditDialog
        open={dialogOpen}
        mode={dialogMode}
        initialName={draftName}
        initialPath={draftPath}
        initialDescription={draftDescription}
        projectId={editingProjectId}
        onClose={() => setDialogOpen(false)}
        onSaved={() => void refreshStore()}
      />
    </div>
  );
}
