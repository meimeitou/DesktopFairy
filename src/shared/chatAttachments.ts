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

const MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/bmp": ".bmp",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "text/csv": ".csv",
  "text/html": ".html",
  "text/css": ".css",
  "text/javascript": ".js",
  "application/javascript": ".js",
  "application/json": ".json",
};

export function extFromMime(mime: string): string {
  const type = mime.toLowerCase().split(";")[0]?.trim() || "";
  return MIME_TO_EXT[type] || "";
}

export function isSupportedAttachmentName(name: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(fileExtFromName(name));
}

/** Clipboard/drag File objects often have empty or generic names. */
export function guessAttachmentFileName(file: {
  name?: string;
  type?: string;
}): string {
  const raw = String(file.name || "").trim();
  const namedExt = fileExtFromName(raw);
  if (raw && namedExt && raw.toLowerCase() !== "blob") return raw;

  const mimeExt = extFromMime(file.type || "");
  const stem =
    raw && raw.toLowerCase() !== "blob"
      ? raw.replace(/\.[^.]+$/, "")
      : mimeExt && isImageExt(mimeExt)
        ? "pasted-image"
        : "pasted-file";
  const ext = namedExt || mimeExt;
  return ext ? `${stem}${ext}` : stem;
}

export function collectDataTransferFiles(
  dt: Pick<DataTransfer, "files" | "items"> | null | undefined,
): File[] {
  if (!dt) return [];
  const out: File[] = [];
  const seen = new Set<string>();
  const add = (file: File | null | undefined) => {
    if (!file) return;
    const key = `${file.name}\0${file.size}\0${file.type}\0${file.lastModified}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(file);
  };
  if (dt.files) {
    for (const file of Array.from(dt.files)) add(file);
  }
  if (dt.items) {
    for (let i = 0; i < dt.items.length; i++) {
      const item = dt.items[i];
      if (item.kind === "file") add(item.getAsFile() ?? undefined);
    }
  }
  return out;
}

export function dataTransferHasFiles(
  types: ArrayLike<string> | readonly string[] | undefined,
): boolean {
  if (!types) return false;
  for (let i = 0; i < types.length; i++) {
    if (types[i] === "Files") return true;
  }
  return false;
}
