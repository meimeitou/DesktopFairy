import { NamedIcon } from "../NamedIcon";
import { Button } from "@cherrystudio/ui";
import { X } from "lucide-react";

import type { ChatAttachment } from "../../shared/chatAttachments";
import { formatFileSize, isImageExt } from "../../shared/chatAttachments";
import "./AttachmentPreview.css";

function truncateName(name: string, max = 18): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 3)}...`;
}

function FileIcon({ ext }: { ext: string }) {
  return (
    <NamedIcon name={isImageExt(ext) ? "Image" : "File"} size={14} />
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
          <Button variant="ghost" size="sm" className="attachment-chip-remove" onClick={() => onRemove(file.id)} title="移除" aria-label={`移除 ${file.name}`}><X size={12} /></Button>
        </div>
      ))}
    </div>
  );
}
