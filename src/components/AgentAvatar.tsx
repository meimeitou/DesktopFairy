import { useEffect, useState } from "react";
import { isImageAvatar, toAvatarDisplay } from "../shared/agentAvatar";

const api = window.electronAPI;

/**
 * Agent avatar: renders uploaded images (`img:` via main-process resolve,
 * `data:` inline) and falls back to the emoji display form.
 */
export default function AgentAvatar({
  avatar,
  className,
}: {
  avatar: string;
  className?: string;
}) {
  const image = isImageAvatar(avatar);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!image) {
      setSrc(null);
      return;
    }
    const v = avatar.trim();
    if (v.startsWith("data:image/")) {
      setSrc(v);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const resolved = (await api.invoke(
          "agent:avatar:resolve",
          avatar,
        )) as string | null;
        if (!cancelled) setSrc(resolved);
      } catch {
        if (!cancelled) setSrc(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [avatar, image]);

  return (
    <span className={className} aria-hidden>
      {image && src ? <img src={src} alt="" /> : toAvatarDisplay(avatar)}
    </span>
  );
}
