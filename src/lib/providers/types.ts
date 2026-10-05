import type { Platform } from "@/generated/prisma/client";

export type ProfileData = {
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string;
  bio: string | null;
  followers: number;
};

export type PostData = {
  externalId: string;
  url: string;
  caption: string | null;
  thumbnailUrl: string | null;
  publishedAt: Date;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
};

export type FetchOptions = {
  /** Nombre max de posts récents à récupérer. */
  limit?: number;
  /** Uniquement pour le provider mock : simule l'état des métriques à cette date (backfill). */
  asOf?: Date;
};

/**
 * Abstraction d'une source de données sociales. Permet de brancher au choix :
 * - un provider "mock" (dev, démo)
 * - une API de scraping de données publiques (ScrapeCreators, Apify, EnsembleData...)
 * - plus tard : les APIs officielles via OAuth pour les comptes possédés en propre.
 */
export interface SocialProvider {
  readonly name: string;
  getProfile(platform: Platform, handle: string): Promise<ProfileData>;
  getRecentPosts(platform: Platform, handle: string, options?: FetchOptions): Promise<PostData[]>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, "").replace(/\/+$/, "").toLowerCase();
}

export function profileUrlFor(platform: Platform, handle: string): string {
  const h = normalizeHandle(handle);
  return platform === "TIKTOK" ? `https://www.tiktok.com/@${h}` : `https://www.instagram.com/${h}/`;
}
