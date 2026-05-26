/** Resolve a public/ asset path for dev server and Electron file:// production. */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "./";
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${base}${normalized}`;
}
