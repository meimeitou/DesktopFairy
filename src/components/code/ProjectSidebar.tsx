import type { CodeProject } from "../../shared/codeProjects";
import "./ProjectSidebar.css";

interface Props {
  projects: CodeProject[];
  activeProjectId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: (project: CodeProject) => void;
  onDelete: (id: string) => void;
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function ProjectSidebar({
  projects,
  activeProjectId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}: Props) {
  return (
    <aside className="code-project-sidebar">
      <div className="code-project-sidebar-header">
        <h2>项目</h2>
        <button type="button" className="code-project-new-btn" onClick={onCreate} title="新建项目">
          <PlusIcon />
        </button>
      </div>
      <ul className="code-project-list">
        {projects.length === 0 ? (
          <li className="code-project-empty">暂无项目，点击 + 添加本地目录</li>
        ) : (
          projects.map((project) => (
            <li key={project.id} className="code-project-row">
              <button
                type="button"
                className={`code-project-item${activeProjectId === project.id ? " active" : ""}`}
                onClick={() => onSelect(project.id)}
                onDoubleClick={() => onEdit(project)}
              >
                <div className="code-project-item-main">
                  <div className="code-project-item-text">
                    <span className="code-project-item-name">{project.name}</span>
                    <span className="code-project-item-path" title={project.path}>
                      {project.path}
                    </span>
                  </div>
                  <div className="code-project-item-actions">
                    <button
                      type="button"
                      className="code-project-item-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(project);
                      }}
                      title="编辑"
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="code-project-item-action-btn danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(project.id);
                      }}
                      title="删除"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </div>
              </button>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
