import type { Platform } from "@/generated/prisma/client";
import { normalizeHandle, profileUrlFor, type FetchOptions, type PostData, type ProfileData, type SocialProvider } from "./types";

/** Hash déterministe (FNV-1a) pour obtenir des données stables par handle. */
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const DAY = 86_400_000;

/**
 * Courbe de vues d'un post en fonction de son âge (jours) : montée rapide puis plateau.
 * `peak` = vues totales asymptotiques.
 */
function viewsAtAge(peak: number, ageDays: number, velocity: number): number {
  if (ageDays <= 0) return 0;
  const saturation = 1 - Math.exp(-ageDays / velocity);
  return Math.round(peak * saturation);
}

/**
 * Provider de démonstration : génère un profil et ~40 posts déterministes par handle,
 * dont les métriques évoluent dans le temps (chaque sync montre une progression réaliste).
 */
export class MockProvider implements SocialProvider {
  readonly name = "mock";

  async getProfile(platform: Platform, rawHandle: string): Promise<ProfileData> {
    const handle = normalizeHandle(rawHandle);
    const r = rng(hash(`${platform}:${handle}:profile`));
    const tier = r();
    const followers = Math.round(tier < 0.5 ? 2_000 + r() * 30_000 : tier < 0.85 ? 40_000 + r() * 200_000 : 300_000 + r() * 1_500_000);
    return {
      handle,
      displayName: handle.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      avatarUrl: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(handle)}`,
      profileUrl: profileUrlFor(platform, handle),
      bio: platform === "TIKTOK" ? "Contenu créé pour la démo 🎬" : "Démo · liens en bio",
      followers,
    };
  }

  async getRecentPosts(platform: Platform, rawHandle: string, options: FetchOptions = {}): Promise<PostData[]> {
    const handle = normalizeHandle(rawHandle);
    const limit = options.limit ?? 40;
    const now = options.asOf ?? new Date();
    const profile = await this.getProfile(platform, handle);
    const r = rng(hash(`${platform}:${handle}:posts`));
    // Rythme de publication : 1 post tous les 1 à 3 jours, à partir d'aujourd'hui (date fixe = 1er posts ancrés sur une base stable).
    const anchor = new Date("2026-01-01T12:00:00Z").getTime();
    const posts: PostData[] = [];
    let t = anchor;
    for (let i = 0; i < 400 && posts.length < 400; i++) {
      t += (1 + Math.floor(r() * 3)) * DAY + Math.floor(r() * 12) * 3_600_000;
      if (t > now.getTime()) break;
      const publishedAt = new Date(t);
      const ageDays = (now.getTime() - t) / DAY;
      // Potentiel du post : la plupart ~ 5-20% de l'audience, quelques "viraux" x5-x30.
      const viral = r() > 0.9;
      const basePeak = profile.followers * (0.05 + r() * 0.15);
      const peak = Math.round(viral ? basePeak * (5 + r() * 25) : basePeak);
      const velocity = 1.5 + r() * 4;
      const views = viewsAtAge(peak, ageDays, velocity);
      const engagement = 0.03 + r() * 0.07;
      const likes = Math.round(views * engagement);
      const comments = Math.round(likes * (0.02 + r() * 0.05));
      const shares = Math.round(likes * (0.05 + r() * 0.15));
      const saves = Math.round(likes * (0.1 + r() * 0.2));
      const externalId = `${platform.toLowerCase()}_${hash(`${handle}:${i}`).toString(36)}`;
      posts.push({
        externalId,
        url: platform === "TIKTOK" ? `https://www.tiktok.com/@${handle}/video/${externalId}` : `https://www.instagram.com/reel/${externalId}/`,
        caption: `${viral ? "🔥 " : ""}Post #${i + 1} de @${handle} ${["#loucio", "#ugc", "#fyp", "#reels"][i % 4]}`,
        thumbnailUrl: `https://picsum.photos/seed/${externalId}/360/640`,
        publishedAt,
        views,
        likes,
        comments,
        shares,
        saves,
      });
    }
    return posts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()).slice(0, limit);
  }
}
