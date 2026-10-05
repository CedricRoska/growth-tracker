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
  /** Nombre max de pages à demander (1 page = 1 appel API = 1 crédit). */
  maxPages?: number;
  /** On arrête de paginer dès qu'une page ne contient que des posts plus vieux que ça. */
  lookbackDays?: number;
  /** Uniquement pour le provider mock : simule l'état des métriques à cette date (backfill). */
  asOf?: Date;
};

export type PostsResult = {
  posts: PostData[];
  /** Profil si la réponse « posts » le contient déjà (évite un appel séparé). */
  profile?: ProfileData;
  /** Crédits restants chez le fournisseur, si l'API les renvoie. */
  creditsRemaining?: number;
  /** Nombre d'appels API effectués. */
  requests: number;
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
  getRecentPosts(platform: Platform, handle: string, options?: FetchOptions): Promise<PostsResult>;
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

/** Réglages de synchro lus dans l'environnement (coût = maxPages (+1 si profil séparé) crédits / compte). */
export function syncSettings(): Required<Pick<FetchOptions, "maxPages" | "lookbackDays">> {
  const maxPages = Number(process.env.SYNC_MAX_PAGES);
  const lookbackDays = Number(process.env.SYNC_LOOKBACK_DAYS);
  return {
    maxPages: Number.isFinite(maxPages) && maxPages > 0 ? Math.floor(maxPages) : 3,
    lookbackDays: Number.isFinite(lookbackDays) && lookbackDays > 0 ? Math.floor(lookbackDays) : 90,
  };
}
