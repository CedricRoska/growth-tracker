"use client";

import { useState } from "react";
import { PlatformIcon } from "@/components/dashboard/platform-badge";
import { cn } from "@/lib/utils";

/**
 * Miniature de post. Les CDN TikTok / Instagram refusent souvent les images chargées
 * depuis un autre site (referer) ou expirent : on charge sans referer et on replie
 * sur l'icône de la plateforme si l'image échoue.
 */
export function Thumb({ src, platform, className }: { src: string | null; platform: "TIKTOK" | "INSTAGRAM"; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground", className)}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <PlatformIcon platform={platform} className="size-4" />
      )}
    </div>
  );
}
