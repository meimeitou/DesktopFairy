export type AttachmentKind = "text" | "image" | "other";

export interface ChatAttachment {
  id: string;
  name: string;
  path: string;
  ext: string;
  size: number;
  kind: AttachmentKind;
}

export const SUPPORTED_EXTENSIONS = [
  ".txt", ".md", ".markdown", ".json", ".csv", ".xml", ".yaml", ".yml",
  ".js", ".ts", ".tsx", ".jsx", ".py", ".html", ".css", ".log",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp",
];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageExt(ext: string): boolean {
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"].includes(
    ext.toLowerCase()
  );
}

export function fileExtFromName(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}
