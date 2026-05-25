import type { ChatAttachment } from "../../shared/chatAttachments";
import { formatFileSize, isImageExt } from "../../shared/chatAttachments";
import "./AttachmentPreview.css";

function truncateName(name: string, max = 18): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 3)}...`;
}

function FileIcon({ ext }: { ext: string }) {
  if (isImageExt(ext)) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

interface Props {
  files: ChatAttachment[];
  onRemove: (id: string) => void;
}

export default function AttachmentPreview({ files, onRemove }: Props) {
  if (files.length === 0) return null;

  return (
    <div className="attachment-preview">
      {files.map((file) => (
        <div key={file.id} className="attachment-chip" title={file.name}>
          <span className="attachment-chip-icon">
            <FileIcon ext={file.ext} />
          </span>
          <span className="attachment-chip-name">{truncateName(file.name)}</span>
          <span className="attachment-chip-size">{formatFileSize(file.size)}</span>
          <button
            type="button"
            className="attachment-chip-remove"
            onClick={() => onRemove(file.id)}
            title="移除"
            aria-label={`移除 ${file.name}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
