import { publicUrl } from "./publicUrl";

const BUNDLED_PREFIX = "/models/";
const DFMODEL_PREFIX = "dfmodel://local";

export function isBundledModelPath(modelPath: string): boolean {
  return modelPath.startsWith(BUNDLED_PREFIX);
}

export function isLocalModelPath(modelPath: string): boolean {
  if (!modelPath || isBundledModelPath(modelPath)) return false;
  if (modelPath.startsWith("dfmodel://")) return true;
  if (/^[A-Za-z]:[\\/]/.test(modelPath)) return true;
  return modelPath.startsWith("/");
}

export function toLoadableModelUrl(modelPath: string): string {
  const trimmed = modelPath.trim();
  if (!trimmed) return trimmed;
  if (isBundledModelPath(trimmed)) return publicUrl(trimmed);
  if (trimmed.startsWith("dfmodel://")) {
    // Migrate legacy URLs that lost the leading path slash (dfmodel://users/...).
    if (/^dfmodel:\/\/[^/]+(?:\/|$)/i.test(trimmed) && !trimmed.startsWith(DFMODEL_PREFIX)) {
      const rest = trimmed.slice("dfmodel://".length);
      const slash = rest.indexOf("/");
      if (slash !== -1) {
        const host = rest.slice(0, slash);
        const tail = rest.slice(slash);
        if (host && !host.includes(".") && host === host.toLowerCase()) {
          return `${DFMODEL_PREFIX}/${host}${tail}`;
        }
      }
    }
    return trimmed;
  }
  if (isLocalModelPath(trimmed)) {
    const normalized = trimmed.replace(/\\/g, "/");
    const withLeadingSlash = normalized.startsWith("/")
      ? normalized
      : `/${normalized}`;
    return `${DFMODEL_PREFIX}${encodeURI(withLeadingSlash)}`;
  }
  return trimmed;
}

export function modelDisplayName(modelPath: string): string {
  const trimmed = modelPath.trim();
  if (!trimmed) return "";
  const withoutQuery = trimmed.split("?")[0];
  const file = withoutQuery.split(/[/\\]/).pop() ?? withoutQuery;
  if (file.endsWith(".model3.json")) {
    return file.slice(0, -".model3.json".length);
  }
  return file;
}
