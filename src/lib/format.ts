const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("fr-FR");
const pct = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });

export function formatCompact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "–";
  return compact.format(n);
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "–";
  return full.format(n);
}

/** Variation relative (ex: +12,5 %). `null` si pas de base de comparaison. */
export function formatDelta(current: number, previous: number): string | null {
  if (!previous) return null;
  return pct.format((current - previous) / previous);
}

export function formatPercent(ratio: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(ratio);
}

export function formatDate(
  d: Date | string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" },
): string {
  if (!d) return "–";
  return new Intl.DateTimeFormat("fr-FR", opts).format(typeof d === "string" ? new Date(d) : d);
}

export function formatRelative(d: Date | string | null | undefined): string {
  if (!d) return "jamais";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = (Date.now() - date.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
  if (diff < 60) return "à l’instant";
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
  return rtf.format(-Math.round(diff / 86400), "day");
}

export function engagementRate(p: { views: number; likes: number; comments: number; shares: number; saves: number }): number {
  if (!p.views) return 0;
  return (p.likes + p.comments + p.shares + p.saves) / p.views;
}

export const PLATFORM_LABEL: Record<"TIKTOK" | "INSTAGRAM", string> = { TIKTOK: "TikTok", INSTAGRAM: "Instagram" };
export const OWNERSHIP_LABEL: Record<"OWNED" | "CREATOR", string> = { OWNED: "Compte interne", CREATOR: "Créateur" };
