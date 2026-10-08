import { prisma } from "@/lib/prisma";
import { Prisma, type Ownership, type Platform } from "@/generated/prisma/client";
import { PERIODS, type Period, type SeriesPoint } from "@/lib/periods";
import { buildSegments, dailySeries, roundMetrics, sumBy, sumSegments, ZERO, type Metrics, type Segment, type SnapshotRow } from "@/lib/accrual";

export { PERIODS, type Period, type SeriesPoint };

export type Filters = {
  workspaceId: string;
  days: Period;
  platform?: Platform;
  ownership?: Ownership;
  creatorId?: string;
  accountId?: string;
};

const DAY = 86_400_000;

export type SearchParams = Record<string, string | string[] | undefined>;

export function parseFilters(workspaceId: string, sp: SearchParams): Filters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) as string | undefined;
  const daysRaw = Number(one("days"));
  const days = (PERIODS.includes(daysRaw as Period) ? daysRaw : 30) as Period;
  const platform = one("platform");
  const ownership = one("ownership");
  return {
    workspaceId,
    days,
    platform: platform === "TIKTOK" || platform === "INSTAGRAM" ? platform : undefined,
    ownership: ownership === "OWNED" || ownership === "CREATOR" ? ownership : undefined,
    creatorId: one("creator") || undefined,
  };
}

function accountWhere(f: Filters): Prisma.AccountWhereInput {
  return {
    workspaceId: f.workspaceId,
    ...(f.platform ? { platform: f.platform } : {}),
    ...(f.ownership ? { ownership: f.ownership } : {}),
    ...(f.creatorId ? { creatorId: f.creatorId } : {}),
    ...(f.accountId ? { id: f.accountId } : {}),
  };
}

// ---------------------------------------------------------------------------
// Chargement des photos de compteurs → segments de gain (voir src/lib/accrual.ts)
// ---------------------------------------------------------------------------

type Loaded = {
  segments: Segment[];
  posts: { id: string; accountId: string; publishedAt: Date }[];
  /** Dates de rafraîchissement par compte, triées. */
  syncTimes: Map<string, number[]>;
  /** Nombre de rafraîchissements distincts (heures distinctes) dans [start, now]. */
  syncsInPeriod: number;
};

/**
 * Charge les posts des comptes filtrés, leurs photos depuis `since` plus, pour chaque post,
 * la dernière photo antérieure (base de calcul), et construit les segments de gain.
 */
async function loadSegments(f: Filters, since: Date, start: Date): Promise<Loaded> {
  const where = accountWhere(f);
  const [posts, accountSnaps] = await Promise.all([
    prisma.post.findMany({ where: { account: where }, select: { id: true, accountId: true, publishedAt: true } }),
    prisma.accountSnapshot.findMany({ where: { account: where }, orderBy: { capturedAt: "asc" }, select: { accountId: true, capturedAt: true } }),
  ]);
  const syncTimes = new Map<string, number[]>();
  const periodSyncs = new Set<number>();
  for (const s of accountSnaps) {
    const t = s.capturedAt.getTime();
    const list = syncTimes.get(s.accountId);
    if (list) list.push(t);
    else syncTimes.set(s.accountId, [t]);
    if (t >= start.getTime()) periodSyncs.add(Math.floor(t / 3_600_000)); // un rafraîchissement = une heure distincte
  }
  if (posts.length === 0) return { segments: [], posts, syncTimes, syncsInPeriod: periodSyncs.size };

  const ids = posts.map((p) => p.id);
  const select = { postId: true, capturedAt: true, views: true, likes: true, comments: true, shares: true, saves: true } as const;
  const [recent, baseline] = await Promise.all([
    prisma.postSnapshot.findMany({ where: { postId: { in: ids }, capturedAt: { gte: since } }, select }),
    prisma.$queryRaw<SnapshotRow[]>`
      SELECT DISTINCT ON ("postId") "postId", "capturedAt", "views", "likes", "comments", "shares", "saves"
      FROM "PostSnapshot"
      WHERE "postId" IN (${Prisma.join(ids)}) AND "capturedAt" < ${since}
      ORDER BY "postId", "capturedAt" DESC`,
  ]);
  const segments = buildSegments(posts, [...baseline, ...recent], syncTimes);
  return { segments, posts, syncTimes, syncsInPeriod: periodSyncs.size };
}

// ---------------------------------------------------------------------------
// Followers : dernier état connu par compte (interpolé entre deux photos)
// ---------------------------------------------------------------------------

type FollowerSnap = { accountId: string; capturedAt: Date; followers: number };

function followersAt(snaps: FollowerSnap[], at: Date) {
  const t = at.getTime();
  const before = new Map<string, FollowerSnap>();
  const after = new Map<string, FollowerSnap>();
  for (const s of snaps) {
    if (s.capturedAt.getTime() <= t) before.set(s.accountId, s);
    else if (!after.has(s.accountId)) after.set(s.accountId, s);
  }
  const byAccount = new Map<string, number>();
  for (const [accountId, b] of before) {
    const a = after.get(accountId);
    let value = b.followers;
    if (a) {
      const span = a.capturedAt.getTime() - b.capturedAt.getTime();
      const ratio = span > 0 ? (t - b.capturedAt.getTime()) / span : 0;
      value = Math.round(b.followers + (a.followers - b.followers) * ratio);
    }
    byAccount.set(accountId, value);
  }
  return byAccount;
}

// ---------------------------------------------------------------------------
// Vue d'ensemble
// ---------------------------------------------------------------------------

/**
 * Métriques « sur la période » = vues / likes GAGNÉS pendant la période, quel que soit l'âge
 * des posts (méthode viral.app). Nécessite au moins deux rafraîchissements dans la période
 * pour être précis ; `syncsInPeriod` permet de l'indiquer à l'utilisateur.
 */
export type Overview = {
  period: Period;
  views: number;
  viewsPrev: number;
  likes: number;
  likesPrev: number;
  followers: number;
  /** null si aucun snapshot antérieur au début de la période. */
  followersGained: number | null;
  postsPublished: number;
  postsPublishedPrev: number;
  totalViews: number;
  accounts: number;
  syncsInPeriod: number;
  /** Vues / likes gagnés chaque jour. */
  series: SeriesPoint[];
};

export async function getOverview(f: Filters): Promise<Overview> {
  const now = new Date();
  const start = new Date(now.getTime() - f.days * DAY);
  const prevStart = new Date(start.getTime() - f.days * DAY);
  const where = accountWhere(f);

  const [loaded, postsPublished, postsPublishedPrev, followerSnaps, accountsList, totals] = await Promise.all([
    loadSegments(f, prevStart, start),
    prisma.post.count({ where: { account: where, publishedAt: { gte: start } } }),
    prisma.post.count({ where: { account: where, publishedAt: { gte: prevStart, lt: start } } }),
    prisma.accountSnapshot.findMany({ where: { account: where }, orderBy: { capturedAt: "asc" }, select: { accountId: true, capturedAt: true, followers: true } }),
    prisma.account.findMany({ where, select: { id: true, followers: true } }),
    prisma.post.aggregate({ where: { account: where }, _sum: { views: true } }),
  ]);

  const cur = roundMetrics(sumSegments(loaded.segments, start.getTime(), now.getTime()));
  const prev = roundMetrics(sumSegments(loaded.segments, prevStart.getTime(), start.getTime()));
  const followers = accountsList.reduce((s, a) => s + a.followers, 0);
  const base = followersAt(followerSnaps, start);
  const hasHistory = base.size > 0;
  const followersBase = [...base.values()].reduce((s, v) => s + v, 0);
  const series = dailySeries(loaded.segments, start.getTime(), f.days).map((p) => ({ ...p, followers }));

  return {
    period: f.days,
    views: cur.views,
    viewsPrev: prev.views,
    likes: cur.likes,
    likesPrev: prev.likes,
    followers,
    followersGained: hasHistory ? followers - followersBase : null,
    postsPublished,
    postsPublishedPrev,
    totalViews: totals._sum.views ?? 0,
    accounts: accountsList.length,
    syncsInPeriod: loaded.syncsInPeriod,
    series,
  };
}

// ---------------------------------------------------------------------------
// Comptes
// ---------------------------------------------------------------------------

export type AccountRow = {
  id: string;
  platform: Platform;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  ownership: Ownership;
  creator: { id: string; name: string } | null;
  followers: number;
  /** null sans historique de snapshots. */
  followersGained: number | null;
  /** Vues gagnées sur la période. */
  viewsInPeriod: number;
  likesInPeriod: number;
  totalViews: number;
  postsInPeriod: number;
  syncStatus: string;
  syncError: string | null;
  lastSyncedAt: Date | null;
  isActive: boolean;
};

export async function getAccountsLeaderboard(f: Filters): Promise<AccountRow[]> {
  const now = new Date();
  const start = new Date(now.getTime() - f.days * DAY);
  const where = accountWhere(f);
  const [accounts, loaded, followerSnaps, postCounts, totals] = await Promise.all([
    prisma.account.findMany({ where, include: { creator: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } }),
    loadSegments(f, new Date(start.getTime() - DAY), start),
    prisma.accountSnapshot.findMany({ where: { account: where }, orderBy: { capturedAt: "asc" }, select: { accountId: true, capturedAt: true, followers: true } }),
    prisma.post.groupBy({ by: ["accountId"], where: { account: where, publishedAt: { gte: start } }, _count: { _all: true } }),
    prisma.post.groupBy({ by: ["accountId"], where: { account: where }, _sum: { views: true } }),
  ]);
  const gained = sumBy(loaded.segments, "accountId", start.getTime(), now.getTime());
  const base = followersAt(followerSnaps, start);
  const counts = new Map(postCounts.map((c) => [c.accountId, c._count._all]));
  const totalViews = new Map(totals.map((c) => [c.accountId, c._sum.views ?? 0]));
  return accounts
    .map((a) => {
      const g = gained.get(a.id) ?? ZERO;
      const b = base.get(a.id);
      return {
        id: a.id,
        platform: a.platform,
        handle: a.handle,
        displayName: a.displayName,
        avatarUrl: a.avatarUrl,
        profileUrl: a.profileUrl,
        ownership: a.ownership,
        creator: a.creator,
        followers: a.followers,
        followersGained: b != null ? a.followers - b : null,
        viewsInPeriod: Math.round(g.views),
        likesInPeriod: Math.round(g.likes),
        totalViews: totalViews.get(a.id) ?? 0,
        postsInPeriod: counts.get(a.id) ?? 0,
        syncStatus: a.syncStatus,
        syncError: a.syncError,
        lastSyncedAt: a.lastSyncedAt,
        isActive: a.isActive,
      };
    })
    .sort((x, y) => y.viewsInPeriod - x.viewsInPeriod);
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export type PostRow = {
  id: string;
  url: string;
  caption: string | null;
  thumbnailUrl: string | null;
  publishedAt: Date;
  /** Compteurs actuels (cumul depuis la publication). */
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  /** Gagné sur la période. */
  gained: Metrics;
  account: {
    id: string;
    handle: string;
    platform: Platform;
    avatarUrl: string | null;
    ownership: Ownership;
    creator: { name: string } | null;
  };
};

export type PostSort = "views" | "likes" | "engagement" | "recent";

/**
 * Posts classés par ce qu'ils ont gagné sur la période (sauf tri « récents » : date de
 * publication). Un post sans gain sur la période n'apparaît pas, sauf en tri « récents ».
 */
export async function getTopPosts(f: Filters, opts: { limit?: number; sort?: PostSort } = {}): Promise<PostRow[]> {
  const { limit = 10, sort = "views" } = opts;
  const now = new Date();
  const start = new Date(now.getTime() - f.days * DAY);
  const [loaded, posts] = await Promise.all([
    loadSegments(f, new Date(start.getTime() - DAY), start),
    prisma.post.findMany({
      where: { account: accountWhere(f), ...(sort === "recent" ? {} : {}) },
      include: { account: { select: { id: true, handle: true, platform: true, avatarUrl: true, ownership: true, creator: { select: { name: true } } } } },
    }),
  ]);
  const gainedBy = sumBy(loaded.segments, "postId", start.getTime(), now.getTime());
  const rows: PostRow[] = posts.map((p) => ({ ...p, gained: roundMetrics(gainedBy.get(p.id) ?? ZERO) }));
  const er = (m: Metrics) => (m.views ? (m.likes + m.comments + m.shares + m.saves) / m.views : 0);
  let sorted: PostRow[];
  switch (sort) {
    case "recent":
      sorted = rows.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
      break;
    case "likes":
      sorted = rows.filter((r) => r.gained.likes > 0).sort((a, b) => b.gained.likes - a.gained.likes);
      break;
    case "engagement":
      sorted = rows.filter((r) => r.gained.views >= 1000).sort((a, b) => er(b.gained) - er(a.gained));
      break;
    default:
      sorted = rows.filter((r) => r.gained.views > 0).sort((a, b) => b.gained.views - a.gained.views);
  }
  return sorted.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Créateurs
// ---------------------------------------------------------------------------

export type CreatorRow = {
  id: string | null;
  name: string;
  ownership: Ownership;
  accounts: number;
  followers: number;
  viewsInPeriod: number;
  postsInPeriod: number;
  platforms: Platform[];
};

/** Classement par créateur (les comptes internes sont regroupés sous le nom du workspace). */
export async function getCreatorsLeaderboard(f: Filters, workspaceName: string): Promise<CreatorRow[]> {
  const rows = await getAccountsLeaderboard(f);
  const groups = new Map<string, CreatorRow>();
  for (const r of rows) {
    const key = r.ownership === "OWNED" ? "__owned" : (r.creator?.id ?? "__unassigned");
    const g = groups.get(key) ?? {
      id: r.ownership === "OWNED" ? null : (r.creator?.id ?? null),
      name: r.ownership === "OWNED" ? workspaceName : (r.creator?.name ?? "Sans créateur"),
      ownership: r.ownership,
      accounts: 0,
      followers: 0,
      viewsInPeriod: 0,
      postsInPeriod: 0,
      platforms: [],
    };
    g.accounts += 1;
    g.followers += r.followers;
    g.viewsInPeriod += r.viewsInPeriod;
    g.postsInPeriod += r.postsInPeriod;
    if (!g.platforms.includes(r.platform)) g.platforms.push(r.platform);
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.viewsInPeriod - a.viewsInPeriod);
}

// ---------------------------------------------------------------------------
// Divers
// ---------------------------------------------------------------------------

export async function getAccountDetail(workspaceId: string, accountId: string, days: Period) {
  const account = await prisma.account.findFirst({ where: { id: accountId, workspaceId }, include: { creator: true } });
  if (!account) return null;
  const f: Filters = { workspaceId, days, accountId };
  const [overview, posts] = await Promise.all([getOverview(f), getTopPosts(f, { limit: 60, sort: "recent" })]);
  return { account, overview, posts };
}

/** `null` si le workspace n'existe plus (session obsolète, base réinitialisée…). */
export async function getWorkspace(workspaceId: string) {
  return prisma.workspace.findUnique({ where: { id: workspaceId } });
}

export async function getCreators(workspaceId: string) {
  return prisma.creator.findMany({ where: { workspaceId }, orderBy: { name: "asc" }, include: { _count: { select: { accounts: true } } } });
}

export async function getLastSyncRun(workspaceId: string) {
  return prisma.syncRun.findFirst({ where: { workspaceId }, orderBy: { startedAt: "desc" } });
}

/** Dernier rafraîchissement effectif (ajout de compte compris) + comptes en erreur + crédits. */
export async function getSyncStatus(workspaceId: string) {
  const [latest, running, failed, accounts, workspace] = await Promise.all([
    prisma.account.findFirst({ where: { workspaceId, lastSyncedAt: { not: null } }, orderBy: { lastSyncedAt: "desc" }, select: { lastSyncedAt: true } }),
    prisma.account.count({ where: { workspaceId, syncStatus: "RUNNING" } }),
    prisma.account.count({ where: { workspaceId, syncStatus: "ERROR" } }),
    prisma.account.count({ where: { workspaceId, isActive: true } }),
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { providerCredits: true, providerCreditsAt: true } }),
  ]);
  return { at: latest?.lastSyncedAt ?? null, running, failed, accounts, credits: workspace?.providerCredits ?? null };
}
