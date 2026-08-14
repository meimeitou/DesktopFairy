import { useState, useEffect, useCallback } from "react";
import "./OmpFileBrowser.css";

interface FileEntry {
  name: string;
  isDir: boolean;
}

const FILE_ICONS: Record<string, string> = {
  ts: "📜",
  tsx: "📜",
  js: "📜",
  jsx: "📜",
  py: "🐍",
  rs: "🦀",
  go: "🐹",
  json: "📋",
  yaml: "⚙️",
  yml: "⚙️",
  toml: "⚙️",
  md: "📝",
  txt: "📝",
  css: "🎨",
  scss: "🎨",
  less: "🎨",
  html: "🌐",
  xml: "🌐",
  png: "🖼️",
  jpg: "🖼️",
  jpeg: "🖼️",
  gif: "🖼️",
  svg: "🖼️",
  webp: "🖼️",
  sh: "💻",
  bash: "💻",
  c: "⚙️",
  cpp: "⚙️",
  h: "⚙️",
  sql: "🗃️",
  zip: "📦",
  tar: "📦",
  gz: "📦",
};

function fileIcon(name: string, isDir: boolean): string {
  if (isDir) return "📁";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return FILE_ICONS[ext] ?? "📄";
}

interface OmpFileBrowserProps {
  rootDir: string;
  onInsertFile: (relativePath: string) => void;
  onClose: () => void;
}

const api = window.electronAPI;

export default function OmpFileBrowser({
  rootDir,
  onInsertFile,
  onClose,
}: OmpFileBrowserProps) {
  const [currentDir, setCurrentDir] = useState(rootDir);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (dir: string) => {
    setLoading(true);
    try {
      const entries = (await api.invoke("omp:list_files", {
        dir,
      })) as FileEntry[];
      setFiles(entries ?? []);
      setCurrentDir(dir);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(rootDir);
  }, [rootDir, load]);

  const relative = (name: string) => {
    const rel =
      currentDir === rootDir
        ? name
        : currentDir.replace(rootDir + "/", "") + "/" + name;
    return rel;
  };

  const dirName = currentDir.split("/").filter(Boolean).pop() ?? currentDir;

  return (
    <div className="ofb-panel">
      <div className="ofb-header">
        <span className="ofb-title" title={currentDir}>
          {dirName}
        </span>
        {currentDir !== rootDir && (
          <button
            type="button"
            className="ofb-up-btn"
            onClick={() => {
              const parent =
                currentDir.split("/").slice(0, -1).join("/") || "/";
              load(parent.startsWith(rootDir) ? parent : rootDir);
            }}
            title="返回上级"
          >
            ↑
          </button>
        )}
        <button
          type="button"
          className="ofb-close-btn"
          onClick={onClose}
          title="关闭"
        >
          ×
        </button>
      </div>
      <div className="ofb-list">
        {loading ? (
          <div className="ofb-empty">加载中…</div>
        ) : files.length === 0 ? (
          <div className="ofb-empty">空目录</div>
        ) : (
          files.map((f) => (
            <button
              key={f.name}
              type="button"
              className={`ofb-item${f.isDir ? " ofb-dir" : ""}`}
              onClick={() => {
                if (f.isDir) {
                  load(`${currentDir}/${f.name}`);
                } else {
                  onInsertFile(relative(f.name));
                }
              }}
            >
              <span className="ofb-icon">{fileIcon(f.name, f.isDir)}</span>
              <span className="ofb-name">{f.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
