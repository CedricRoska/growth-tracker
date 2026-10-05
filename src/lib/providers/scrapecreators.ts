import type { Platform } from "@/generated/prisma/client";
import { normalizeHandle, profileUrlFor, ProviderError, type FetchOptions, type PostData, type ProfileData, type SocialProvider } from "./types";

/**
 * Provider basé sur l'API ScrapeCreators (https://scrapecreators.com) : données publiques
 * TikTok et Instagram sans OAuth, ce qui permet de suivre des comptes de créateurs tiers.
 *
 * ⚠️ Les chemins/champs ci-dessous suivent la doc publique au moment de l'écriture ;
 * le parsing est volontairement défensif (plusieurs noms de champs testés). À vérifier
 * avec une vraie clé : https://docs.scrapecreators.com
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

  async getRecentPosts(platform: Platform, rawHandle: string, options: FetchOptions = {}): Promise<PostData[]> {
    const handle = normalizeHandle(rawHandle);
    const limit = options.limit ?? 40;
    if (platform === "TIKTOK") {
      const data = await this.request("/v3/tiktok/profile/videos", { handle });
      const items = ((get(data, "aweme_list") ?? get(data, "videos") ?? get(data, "itemList") ?? []) as Json[]).slice(0, limit);
      return items.map((it) => {
        const stats = (it.statistics ?? it.stats ?? {}) as Json;
        const id = String(it.aweme_id ?? it.id ?? "");
        return {
          externalId: id,
          url: str(it.share_url, it.url) ?? `https://www.tiktok.com/@${handle}/video/${id}`,
          caption: str(it.desc, it.description),
          thumbnailUrl: str(get(it, "video.cover.url_list.0"), get(it, "video.cover"), get(it, "video.dynamicCover")),
          publishedAt: toDate(it.create_time ?? it.createTime),
          views: num(stats.play_count, stats.playCount),
          likes: num(stats.digg_count, stats.diggCount),
          comments: num(stats.comment_count, stats.commentCount),
          shares: num(stats.share_count, stats.shareCount),
          saves: num(stats.collect_count, stats.collectCount),
        };
      });
    }
    const data = await this.request("/v2/instagram/user/posts", { handle });
    const items = ((get(data, "items") ?? get(data, "posts") ?? get(data, "data") ?? []) as Json[]).slice(0, limit);
    return items.map((it) => {
      const code = str(it.code, it.shortcode) ?? String(it.id ?? it.pk ?? "");
      const isVideo = (it.media_type === 2 || it.is_video === true) as boolean;
      return {
        externalId: String(it.pk ?? it.id ?? code),
        url: isVideo ? `https://www.instagram.com/reel/${code}/` : `https://www.instagram.com/p/${code}/`,
        caption: str(get(it, "caption.text"), it.caption),
        thumbnailUrl: str(get(it, "image_versions2.candidates.0.url"), it.thumbnail_url, it.display_url),
        publishedAt: toDate(it.taken_at ?? it.taken_at_timestamp),
        views: num(it.play_count, it.view_count, it.video_view_count, it.ig_play_count),
        likes: num(it.like_count, get(it, "edge_liked_by.count")),
        comments: num(it.comment_count, get(it, "edge_media_to_comment.count")),
        shares: num(it.reshare_count, it.share_count),
        saves: num(it.save_count),
      };
    });
  }
}
