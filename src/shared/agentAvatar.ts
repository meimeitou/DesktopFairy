const IMG_PREFIX = "img:";

export const DEFAULT_AGENT_AVATAR = "🧚‍♀️";

export function isImageAvatar(avatar: string): boolean {
  const v = avatar?.trim() || "";
  return v.startsWith(IMG_PREFIX) || v.startsWith("data:image/");
}

export function toAvatarDisplay(avatar: string): string {
  if (!avatar?.trim()) return DEFAULT_AGENT_AVATAR;
  if (isImageAvatar(avatar)) return DEFAULT_AGENT_AVATAR;
  return avatar.trim();
}

export function toAvatarImageSrc(avatar: string, resolvePath?: (rel: string) => string): string | null {
  const v = avatar?.trim() || "";
  if (v.startsWith("data:image/")) return v;
  if (v.startsWith(IMG_PREFIX)) {
    const rel = v.slice(IMG_PREFIX.length);
    return resolvePath ? resolvePath(rel) : rel;
  }
  return null;
}

export function packImageAvatar(relativePath: string): string {
  return `${IMG_PREFIX}${relativePath}`;
}
