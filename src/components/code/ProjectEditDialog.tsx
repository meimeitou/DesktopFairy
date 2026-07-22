import { useEffect, useState } from "react";
import "./ProjectEditDialog.css";

const api = window.electronAPI;

export type ProjectEditMode = "create" | "edit";

interface Props {
  open: boolean;
  mode: ProjectEditMode;
  initialName?: string;
  initialPath?: string;
  initialDescription?: string;
  projectId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProjectEditDialog({
  open,
  mode,
  initialName = "",
  initialPath = "",
  initialDescription = "",
  projectId,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState(initialName);
  const [path, setPath] = useState(initialPath);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setPath(initialPath);
    setDescription(initialDescription);
    setError("");
  }, [open, initialName, initialPath, initialDescription]);

  if (!open) return null;

  const pickDirectory = async () => {
    const result = (await api.invoke("project:pick_directory")) as {
      ok?: boolean;
      canceled?: boolean;
      path?: string;
    };
    if (result?.ok && result.path) setPath(result.path);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        path: path.trim(),
        description: description.trim() || undefined,
      };
      const result =
        mode === "create"
          ? ((await api.invoke("project:create", payload)) as {
              ok?: boolean;
              error?: string;
            })
          : ((await api.invoke("project:update", {
              id: projectId,
              ...payload,
            })) as { ok?: boolean; error?: string });
      if (!result?.ok) {
        setError(result?.error || "保存失败");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="project-edit-overlay" onClick={onClose}>
      <div
        className="project-edit-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2>{mode === "create" ? "新建项目" : "编辑项目"}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            <span>名称</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="我的项目"
              autoFocus
            />
          </label>
          <label>
            <span>目录</span>
            <div className="project-edit-path-row">
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/path/to/project"
              />
              <button type="button" onClick={() => void pickDirectory()}>
                选择…
              </button>
            </div>
          </label>
          <label>
            <span>描述（可选）</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </label>
          {error ? <p className="project-edit-error">{error}</p> : null}
          <div className="project-edit-actions">
            <button type="button" className="secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" disabled={saving}>
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
