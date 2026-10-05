import { Badge } from "@/components/ui/badge";
import { OWNERSHIP_LABEL, PLATFORM_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function PlatformIcon({ platform, className }: { platform: "TIKTOK" | "INSTAGRAM"; className?: string }) {
  return platform === "TIKTOK" ? <TikTokIcon className={cn("size-3.5", className)} /> : <InstagramIcon className={cn("size-3.5", className)} />;
}

export function PlatformBadge({ platform, className }: { platform: "TIKTOK" | "INSTAGRAM"; className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1 font-normal", className)}>
      <PlatformIcon platform={platform} className={platform === "INSTAGRAM" ? "text-pink-600 dark:text-pink-400" : ""} />
      {PLATFORM_LABEL[platform]}
    </Badge>
  );
}

export function OwnershipBadge({ ownership, creatorName }: { ownership: "OWNED" | "CREATOR"; creatorName?: string | null }) {
  return (
    <Badge variant={ownership === "OWNED" ? "secondary" : "outline"} className="font-normal">
      {ownership === "CREATOR" && creatorName ? creatorName : OWNERSHIP_LABEL[ownership]}
    </Badge>
  );
}
