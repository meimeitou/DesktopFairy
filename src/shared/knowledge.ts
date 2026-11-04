export type KnowledgeItemType = "file" | "note";
export type KnowledgeItemStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type KnowledgeBaseKind = "vector" | "semi_structured";

export const KNOWLEDGE_FILE_EXTS = [
  ".txt",
  ".md",
  ".markdown",
  ".pdf",
  ".docx",
] as const;

export const KNOWLEDGE_SEMI_FILE_EXTS = [
  ".txt",
  ".md",
  ".markdown",
  ".json",
  ".yaml",
  ".yml",
] as const;

export const KNOWLEDGE_MAX_FILE_BYTES = 100 * 1024 * 1024;
export const KNOWLEDGE_MAX_BATCH_FILES = 20;
export const KNOWLEDGE_NOTE_CONTENT_MAX = 100_000;
export const KNOWLEDGE_EMBED_BATCH = 10;
export const KNOWLEDGE_PROCESSOR_TIMEOUT_MS = 10 * 60 * 1000;
export const KNOWLEDGE_INDEX_SCHEMA_VERSION = 1;

export const DEFAULT_KNOWLEDGE_TOP_K = 5;
export const DEFAULT_KNOWLEDGE_CHUNK_SIZE = 1024;
export const DEFAULT_KNOWLEDGE_CHUNK_OVERLAP = 200;
export const DEFAULT_KNOWLEDGE_SCORE_THRESHOLD = 0.5;

export const DEFAULT_SEMI_MAX_FILE_BYTES = 64 * 1024;
export const DEFAULT_SEMI_MAX_FILES_PER_QUERY = 3;
export const SEMI_DESCRIPTION_MAX = 500;
export const SEMI_DESCRIPTION_MIN = 20;

export interface KnowledgeSettings {
  embeddingProviderId: string;
  embeddingModel: string;
  topK: number;
  scoreThreshold: number;
  chunkSize: number;
  chunkOverlap: number;
  descriptionProviderId: string;
  descriptionModel: string;
  semiMaxFileBytes: number;
  semiMaxFilesPerQuery: number;
}

export const DEFAULT_KNOWLEDGE_SETTINGS: KnowledgeSettings = {
  embeddingProviderId: "",
  embeddingModel: "",
  topK: DEFAULT_KNOWLEDGE_TOP_K,
  scoreThreshold: DEFAULT_KNOWLEDGE_SCORE_THRESHOLD,
  chunkSize: DEFAULT_KNOWLEDGE_CHUNK_SIZE,
  chunkOverlap: DEFAULT_KNOWLEDGE_CHUNK_OVERLAP,
  descriptionProviderId: "",
  descriptionModel: "",
  semiMaxFileBytes: DEFAULT_SEMI_MAX_FILE_BYTES,
  semiMaxFilesPerQuery: DEFAULT_SEMI_MAX_FILES_PER_QUERY,
};

export interface KnowledgeBase {
  id: string;
  name: string;
  kind: KnowledgeBaseKind;
  createdAt: number;
  updatedAt: number;
  items: KnowledgeItem[];
}

export interface KnowledgeItem {
  id: string;
  baseId: string;
  type: KnowledgeItemType;
  status: KnowledgeItemStatus;
  error?: string;
  sourceName: string;
  relativePath?: string;
  indexedRelativePath?: string;
  noteContent?: string;
  description?: string;
  descriptionUpdatedAt?: number;
  descriptionStatus?: "idle" | "generating" | "failed";
  descriptionError?: string;
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeHit {
  baseId: string;
  baseName: string;
  itemId: string;
  itemType: KnowledgeItemType;
  sourceName: string;
  chunkIndex: number;
  text: string;
  score: number;
}

/** File-level citation used by semi-structured knowledge injection. */
export interface KnowledgeFileCitation {
  baseId: string;
  baseName: string;
  itemId: string;
  sourceName: string;
  kind: "semi_structured";
  description?: string;
}

export interface KnowledgeCitation {
  baseId: string;
  baseName: string;
  itemId: string;
  sourceName: string;
  text: string;
  kind?: "vector" | "semi_structured";
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function clampUnit(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

export function scoreToPercent(score: number): number {
  return Math.round(clampUnit(score, 0) * 100);
}

export function isRelevantHit(score: number, threshold: number): boolean {
  return Number.isFinite(score) && score >= threshold;
}

export function filterHitsByThreshold(
  hits: KnowledgeHit[],
  threshold: number,
): KnowledgeHit[] {
  const min = clampUnit(threshold, DEFAULT_KNOWLEDGE_SCORE_THRESHOLD);
  return hits.filter((hit) => isRelevantHit(hit.score, min));
}

export function normalizeKnowledgeSettings(raw: unknown): KnowledgeSettings {
  const data = raw && typeof raw === "object" ? (raw as Partial<KnowledgeSettings>) : {};
  const chunkSize = clampInt(data.chunkSize, 128, 8192, DEFAULT_KNOWLEDGE_CHUNK_SIZE);
  let chunkOverlap = clampInt(
    data.chunkOverlap,
    0,
    4096,
    DEFAULT_KNOWLEDGE_CHUNK_OVERLAP,
  );
  if (chunkOverlap >= chunkSize) {
    chunkOverlap = Math.max(0, Math.floor(chunkSize / 5));
  }
  return {
    embeddingProviderId:
      typeof data.embeddingProviderId === "string" ? data.embeddingProviderId : "",
    embeddingModel: typeof data.embeddingModel === "string" ? data.embeddingModel : "",
    topK: clampInt(data.topK, 1, 20, DEFAULT_KNOWLEDGE_TOP_K),
    scoreThreshold: clampUnit(data.scoreThreshold, DEFAULT_KNOWLEDGE_SCORE_THRESHOLD),
    chunkSize,
    chunkOverlap,
    descriptionProviderId:
      typeof data.descriptionProviderId === "string" ? data.descriptionProviderId : "",
    descriptionModel:
      typeof data.descriptionModel === "string" ? data.descriptionModel : "",
    semiMaxFileBytes: clampInt(
      data.semiMaxFileBytes,
      1024,
      10 * 1024 * 1024,
      DEFAULT_SEMI_MAX_FILE_BYTES,
    ),
    semiMaxFilesPerQuery: clampInt(
      data.semiMaxFilesPerQuery,
      1,
      10,
      DEFAULT_SEMI_MAX_FILES_PER_QUERY,
    ),
  };
}

export function knowledgeSettingsConfigured(settings: KnowledgeSettings): boolean {
  return Boolean(settings.embeddingProviderId.trim() && settings.embeddingModel.trim());
}

export function semiDescriptionConfigured(settings: KnowledgeSettings): boolean {
  return Boolean(
    settings.descriptionProviderId.trim() && settings.descriptionModel.trim(),
  );
}

export function normalizeKnowledgeBaseKind(raw: unknown): KnowledgeBaseKind {
  return raw === "semi_structured" ? "semi_structured" : "vector";
}

export function normalizeDescription(raw: unknown): string {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  if (text.length <= SEMI_DESCRIPTION_MAX) return text;
  return `${text.slice(0, SEMI_DESCRIPTION_MAX - 1)}…`;
}

export function isAllowedKnowledgeExt(fileName: string): boolean {
  const ext = fileName.includes(".")
    ? `.${fileName.split(".").pop()!.toLowerCase()}`
    : "";
  return (KNOWLEDGE_FILE_EXTS as readonly string[]).includes(ext);
}

export function isAllowedSemiExt(fileName: string): boolean {
  const ext = fileName.includes(".")
    ? `.${fileName.split(".").pop()!.toLowerCase()}`
    : "";
  return (KNOWLEDGE_SEMI_FILE_EXTS as readonly string[]).includes(ext);
}

export function allowedExtsForKind(kind: KnowledgeBaseKind): readonly string[] {
  return kind === "semi_structured" ? KNOWLEDGE_SEMI_FILE_EXTS : KNOWLEDGE_FILE_EXTS;
}

export function uniqueCopyName(existingNames: string[], fileName: string): string {
  const set = new Set(existingNames.map((n) => n.toLowerCase()));
  if (!set.has(fileName.toLowerCase())) return fileName;
  const dot = fileName.lastIndexOf(".");
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot) : "";
  for (let i = 2; i < 1000; i++) {
    const next = `${stem} (${i})${ext}`;
    if (!set.has(next.toLowerCase())) return next;
  }
  return `${stem} (${Date.now()})${ext}`;
}

export function mergeKnowledgeHits(hits: KnowledgeHit[], topK: number): KnowledgeHit[] {
  const k = Math.max(1, topK);
  return [...hits]
    .sort((a, b) => b.score - a.score || a.baseName.localeCompare(b.baseName))
    .slice(0, k);
}

export function formatKnowledgeContext(hits: KnowledgeHit[]): string {
  if (hits.length === 0) return "";
  const body = hits
    .map(
      (hit, i) =>
        `[${i + 1}] (${hit.baseName} / ${hit.sourceName})\n${hit.text}`,
    )
    .join("\n\n");
  return `以下是从用户勾选的知识库中检索到的资料，请优先依据这些内容回答；若资料不足请明确说明。\n\n${body}`;
}

export function hitsToCitations(hits: KnowledgeHit[]): KnowledgeCitation[] {
  return hits.map((hit) => ({
    baseId: hit.baseId,
    baseName: hit.baseName,
    itemId: hit.itemId,
    sourceName: hit.sourceName,
    text: hit.text,
    kind: "vector" as const,
  }));
}

export const DOCUMENT_IMAGE_PLACEHOLDER = "[图片]";

/** Replace embedded/local images in PDF/docx markdown with a short placeholder. */
export function replaceDocumentImages(markdown: string): string {
  let text = String(markdown || "");
  text = text.replace(
    /!\[[^\]]*\]\(\s*data:image\/[a-zA-Z0-9.+-]+;base64,[^)]*\)/gi,
    DOCUMENT_IMAGE_PLACEHOLDER,
  );
  text = text.replace(
    /<img\b[^>]*\bsrc=["']\s*data:image\/[^"']+["'][^>]*>/gi,
    DOCUMENT_IMAGE_PLACEHOLDER,
  );
  text = text.replace(
    /!\[[^\]]*\]\(\s*(?!https?:\/\/|mailto:)[^)]+\.(?:png|jpe?g|gif|webp|bmp|svg|tiff?)(?:\s+"[^"]*")?\s*\)/gi,
    DOCUMENT_IMAGE_PLACEHOLDER,
  );
  text = text.replace(/<img\b[^>]*>/gi, DOCUMENT_IMAGE_PLACEHOLDER);
  text = text.replace(/!\[[^\]]*\]\(\s*(?:about:blank|#)?\s*\)/gi, DOCUMENT_IMAGE_PLACEHOLDER);
  text = text.replace(/(?:\[图片\][ \t]*){2,}/g, DOCUMENT_IMAGE_PLACEHOLDER);
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

export function normalizeKnowledgeBaseIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of raw) {
    if (typeof id !== "string" || !id.trim() || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
