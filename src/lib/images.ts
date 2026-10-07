import sharp from "sharp";

/**
 * Mise en cache des images externes (avatars, vignettes).
 *
 * Les CDN de TikTok et Instagram servent des URL signées qui expirent en ~24 h, et TikTok
 * renvoie souvent du HEIC illisible dans les navigateurs. On télécharge donc l'image au moment
 * du rafraîchissement, on la réduit en WebP de quelques Ko et on stocke une data URL en base.
 * La « source » (URL sans signature) permet de ne pas re-télécharger une image inchangée.
 */

export type CachedImage = { data: string | null; source: string | null };

export type CacheImageOptions = {
  width: number;
  height: number;
  quality?: number;
  /** Image déjà en cache : conservée si la source n'a pas changé ou si le téléchargement échoue. */
  previous?: CachedImage;
  timeoutMs?: number;
};

/** URL sans query string : stable d'un rafraîchissement à l'autre même si la signature change. */
export function imageSource(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return url.split("?")[0] ?? null;
  }
}

export async function cacheImage(url: string | null | undefined, opts: CacheImageOptions): Promise<CachedImage> {
  const previous = opts.previous ?? { data: null, source: null };
  const source = imageSource(url);
  if (!url || !source) return previous;
  if (previous.source === source && previous.data?.startsWith("data:")) return previous;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; GrowthTracker/1.0)" } });
    clearTimeout(timer);
    if (!res.ok) return previous;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0 || buffer.length > 5_000_000) return previous;

    const webp = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize(opts.width, opts.height, { fit: "cover", position: "attention" })
      .webp({ quality: opts.quality ?? 70 })
      .toBuffer();
    return { data: `data:image/webp;base64,${webp.toString("base64")}`, source };
  } catch {
    // Format non décodable (HEIC sans libheif), réseau, timeout… : on garde l'ancienne image.
    return previous;
  }
}

/** Plusieurs images en parallèle, avec une limite de concurrence pour ménager le CDN. */
export async function cacheImages<T>(items: T[], fn: (item: T) => Promise<void>, concurrency = 6): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item !== undefined) await fn(item);
    }
  });
  await Promise.all(workers);
}

export const AVATAR_SIZE = { width: 96, height: 96, quality: 75 } as const;
export const THUMB_SIZE = { width: 80, height: 108, quality: 60 } as const;
