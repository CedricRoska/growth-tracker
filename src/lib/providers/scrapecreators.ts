import type { Platform } from "@/generated/prisma/client";
import {
  normalizeHandle,
  profileUrlFor,
  ProviderError,
  syncSettings,
  type FetchOptions,
  type PostData,
  type PostsResult,
  type ProfileData,
  type SocialProvider,
} from "./types";

/**
 * Provider basé sur l'API ScrapeCreators (https://scrapecreators.com) : données publiques
 * TikTok et Instagram sans OAuth, ce qui permet de suivre des comptes de créateurs tiers.
 *
 * Coût : 1 crédit par appel. Les posts sont paginés (10 par page TikTok, 12 Instagram),
 * on enchaîne les pages jusqu'à `maxPages` ou jusqu'à dépasser `lookbackDays`.
 * TikTok renvoie le profil (followers, avatar…) dans la réponse des posts : pas d'appel séparé.
 * Mapping validé le 2026-10-05 avec `npm run provider:check`.
 */
const BASE = "https://api.scrapecreators.com";

type Json = Record<string, unknown>;

function num(...vals: unknown[]): number {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Math.round(Number(v));
  }
  return 0;
}
function str(...vals: unknown[]): string | null {
  for (const v of vals) if (typeof v === "string" && v.trim() !== "") return v;
  return null;
}
function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Json)[k] : undefined), obj);
}
/**
 * TikTok renvoie des listes d'URL dont les premières sont souvent en HEIC (illisible dans
 * Chrome / Firefox) ou avec une extension générique `.image` : on préfère un JPEG / PNG / WebP.
 */
function pickImage(...lists: unknown[]): string | null {
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    const urls = list.filter((u): u is string => typeof u === "string" && u.trim() !== "");
    if (urls.length === 0) continue;
    return urls.find((u) => /\.(jpe?g|png|webp)(\?|$)/i.test(u)) ?? urls.at(-1) ?? null;
  }
  return null;
}
function toDate(v: unknown): Date {
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v);
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return new Date(n < 1e12 ? n * 1000 : n);
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export class ScrapeCreatorsProvider implements SocialProvider {
  readonly name = "scrapecreators";

  constructor(private readonly apiKey: string) {
    if (!apiKey) throw new ProviderError("SCRAPECREATORS_API_KEY manquante");
  }

  private async request(path: string, params: Record<string, string>): Promise<Json> {
    const url = new URL(path, BASE);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url, { headers: { "x-api-key": this.apiKey }, cache: "no-store" });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 402) throw new ProviderError("Plus de crédits ScrapeCreators : recharge ton compte.", 402);
      throw new ProviderError(`ScrapeCreators ${res.status} sur ${path}: ${body.slice(0, 200)}`, res.status);
    }
    return (await res.json()) as Json;
  }

  async getProfile(platform: Platform, rawHandle: string): Promise<ProfileData> {
    const handle = normalizeHandle(rawHandle);
    if (platform === "TIKTOK") {
      const data = await this.request("/v1/tiktok/profile", { handle });
      const user = (get(data, "user") ?? data) as Json;
      const stats = (get(data, "stats") ?? get(data, "statsV2") ?? {}) as Json;
      return {
        handle,
        displayName: str(user.nickname, user.uniqueId),
        avatarUrl: str(user.avatarLarger, user.avatarMedium, user.avatarThumb),
        profileUrl: profileUrlFor(platform, handle),
        bio: str(user.signature),
        followers: num(stats.followerCount, user.followerCount),
      };
    }
    const data = await this.request("/v1/instagram/profile", { handle });
    const user = (get(data, "data.user") ?? get(data, "user") ?? data) as Json;
    return {
      handle,
      displayName: str(user.full_name, user.username),
      avatarUrl: str(user.profile_pic_url_hd, user.profile_pic_url),
      profileUrl: profileUrlFor(platform, handle),
      bio: str(user.biography),
      followers: num(get(user, "edge_followed_by.count"), user.follower_count, user.followers),
    };
  }

  async getRecentPosts(platform: Platform, rawHandle: string, options: FetchOptions = {}): Promise<PostsResult> {
    const handle = normalizeHandle(rawHandle);
    const defaults = syncSettings();
    const maxPages = options.maxPages ?? defaults.maxPages;
    const lookback = new Date(Date.now() - (options.lookbackDays ?? defaults.lookbackDays) * 86_400_000);
    return platform === "TIKTOK" ? this.tiktokPosts(handle, maxPages, lookback) : this.instagramPosts(handle, maxPages, lookback);
  }

  private async tiktokPosts(handle: string, maxPages: number, lookback: Date): Promise<PostsResult> {
    const posts: PostData[] = [];
    let profile: ProfileData | undefined;
    let credits: number | undefined;
    let cursor: string | undefined;
    let requests = 0;
    for (let page = 0; page < maxPages; page++) {
      const data = await this.request("/v3/tiktok/profile/videos", { handle, ...(cursor ? { max_cursor: cursor } : {}) });
      requests++;
      credits = typeof data.credits_remaining === "number" ? data.credits_remaining : credits;
      const items = (data.aweme_list ?? []) as Json[];
      if (!profile && items[0]) {
        const a = (items[0].author ?? {}) as Json;
        profile = {
          handle,
          displayName: str(a.nickname, a.unique_id),
          avatarUrl: pickImage(get(a, "avatar_300x300.url_list"), get(a, "avatar_larger.url_list"), get(a, "avatar_medium.url_list"), get(a, "avatar_thumb.url_list")),
          profileUrl: profileUrlFor("TIKTOK", handle),
          bio: str(a.signature),
          followers: num(a.follower_count),
        };
      }
      for (const it of items) {
        const stats = (it.statistics ?? it.stats ?? {}) as Json;
        const id = String(it.aweme_id ?? it.id ?? "");
        if (!id) continue;
        posts.push({
          externalId: id,
          url: str(it.share_url) ?? `https://www.tiktok.com/@${handle}/video/${id}`,
          caption: str(it.desc),
          thumbnailUrl: pickImage(get(it, "video.cover.url_list"), get(it, "video.origin_cover.url_list"), get(it, "video.dynamic_cover.url_list")),
          publishedAt: toDate(it.create_time),
          views: num(stats.play_count),
          likes: num(stats.digg_count),
          comments: num(stats.comment_count),
          shares: num(stats.share_count),
          saves: num(stats.collect_count),
        });
      }
      const oldest = items.at(-1);
      const hasMore = data.has_more === 1 || data.has_more === true;
      const next = data.max_cursor != null ? String(data.max_cursor) : undefined;
      if (!hasMore || !next || items.length === 0 || (oldest && toDate(oldest.create_time) < lookback)) break;
      cursor = next;
    }
    posts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    return { posts, profile, creditsRemaining: credits, requests };
  }

  private async instagramPosts(handle: string, maxPages: number, lookback: Date): Promise<PostsResult> {
    const posts: PostData[] = [];
    let credits: number | undefined;
    let cursor: string | undefined;
    let requests = 0;
    for (let page = 0; page < maxPages; page++) {
      const data = await this.request("/v2/instagram/user/posts", { handle, ...(cursor ? { next_max_id: cursor } : {}) });
      requests++;
      credits = typeof data.credits_remaining === "number" ? data.credits_remaining : credits;
      const items = (data.items ?? []) as Json[];
      for (const it of items) {
        const code = str(it.code, it.shortcode) ?? String(it.id ?? it.pk ?? "");
        const isVideo = it.media_type === 2 || it.is_video === true;
        posts.push({
          externalId: String(it.pk ?? it.id ?? code),
          url: isVideo ? `https://www.instagram.com/reel/${code}/` : `https://www.instagram.com/p/${code}/`,
          caption: str(get(it, "caption.text")),
          thumbnailUrl: str(get(it, "image_versions2.candidates.0.url"), it.thumbnail_url, it.display_url),
          publishedAt: toDate(it.taken_at ?? it.taken_at_timestamp),
          views: num(it.play_count, it.ig_play_count, it.view_count, it.video_view_count),
          likes: num(it.like_count),
          comments: num(it.comment_count),
          shares: num(it.reshare_count, it.share_count),
          saves: num(it.save_count),
        });
      }
      const oldest = items.at(-1);
      const next = str(data.next_max_id) ?? undefined;
      if (!data.more_available || !next || items.length === 0 || (oldest && toDate(oldest.taken_at) < lookback)) break;
      cursor = next;
    }
    // Instagram ne renvoie pas les followers avec les posts : le profil reste un appel séparé.
    posts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    return { posts, creditsRemaining: credits, requests };
  }
}
