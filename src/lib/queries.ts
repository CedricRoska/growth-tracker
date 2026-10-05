import { prisma } from "@/lib/prisma";
import type { Ownership, Platform, Prisma } from "@/generated/prisma/client";
import { PERIODS, type Period, type SeriesPoint } from "@/lib/periods";

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

type Snap = { accountId: string; capturedAt: Date; followers: number; totalViews: number; totalLikes: number };

/**
 * État de chaque compte à l'instant `at` (snapshots triés par date croissante).
 * Les données ne sont rafraîchies qu'à la demande : entre deux snapshots, on interpole
 * linéairement pour que les courbes journalières restent lisibles (sinon tout le gain
 * tomberait sur le jour du rafraîchissement). Avant le premier snapshot : 0.
 */
function stateAt(snaps: Snap[], at: Date) {
  const t = at.getTime();
  const before = new Map<string, Snap>();
  const after = new Map<string, Snap>();
  for (const s of snaps) {
    if (s.capturedAt.getTime() <= t) before.set(s.accountId, s);
    else if (!after.has(s.accountId)) after.set(s.accountId, s);
  }
  const byAccount = new Map<string, Snap>();
  let views = 0;
  let followers = 0;
  let likes = 0;
  for (const [accountId, b] of before) {
    const a = after.get(accountId);
    let state = b;
    if (a) {
      const span = a.capturedAt.getTime() - b.capturedAt.getTime();
      const ratio = span > 0 ? (t - b.capturedAt.getTime()) / span : 0;
      const lerp = (x: number, y: number) => Math.round(x + (y - x) * ratio);
      state = {
        accountId,
        capturedAt: at,
        followers: lerp(b.followers, a.followers),
        totalViews: lerp(b.totalViews, a.totalViews),
        totalLikes: lerp(b.totalLikes, a.totalLikes),
      };
    }
    byAccount.set(accountId, state);
    views += state.totalViews;
    followers += state.followers;
    likes += state.totalLikes;
  }
  return { views, followers, likes, byAccount };
}

/**
 * Définition des métriques « sur la période » (même logique que viral.app) :
 * vues / likes / posts = contenu PUBLIÉ pendant la période, avec ses compteurs actuels.
 * Disponible dès le premier rafraîchissement, sans historique. Les snapshots ne servent
 * qu'à la croissance des followers (null tant qu'il n'y a pas de point de comparaison).
 */
export type Overview = {
  period: Period;
  views: number;
  viewsPrev: number;
  likes: number;
  likesPrev: number;
  followers: number;
  /** null si aucun snapshot antérieur au début de la période (pas encore d'historique). */
  followersGained: number | null;
  postsPublished: number;
  postsPublishedPrev: number;
  totalViews: number;
  accounts: number;
  /** Vues / likes des posts par jour de publication. */
  series: SeriesPoint[];
};

type PostMetric = { publishedAt: Date; views: number; likes: number };

function sumMetrics(posts: PostMetric[]) {
  return posts.reduce((acc, p) => ({ views: acc.views + p.views, likes: acc.likes + p.likes }), { views: 0, likes: 0 });
}

export async function getOverview(f: Filters): Promise<Overview> {
  const now = new Date();
  const start = new Date(now.getTime() - f.days * DAY);
  const prevStart = new Date(start.getTime() - f.days * DAY);
  const where = accountWhere(f);

  const [posts, prevPosts, snaps, accountsList, totals] = await Promise.all([
    prisma.post.findMany({ where: { account: where, publishedAt: { gte: start } }, select: { publishedAt: true, views: true, likes: true } }),
    prisma.post.findMany({ where: { account: where, publishedAt: { gte: prevStart, lt: start } }, select: { publishedAt: true, views: true, likes: true } }),
    prisma.accountSnapshot.findMany({
      where: { account: where },
      orderBy: { capturedAt: "asc" },
      select: { accountId: true, capturedAt: true, followers: true, totalViews: true, totalLikes: true },
    }),
    prisma.account.findMany({ where, select: { followers: true } }),
    prisma.post.aggregate({ where: { account: where }, _sum: { views: true } }),
  ]);

  const cur = sumMetrics(posts);
  const prev = sumMetrics(prevPosts);
  const followers = accountsList.reduce((s, a) => s + a.followers, 0);
  const startState = stateAt(snaps, start);
  const hasHistory = startState.byAccount.size > 0;

  // Série : un point par jour de la période, vues / likes des posts publiés ce jour-là.
  const buckets = new Map<string, SeriesPoint>();
  for (let i = 0; i < f.days; i++) {
    const day = new Date(start.getTime() + (i + 1) * DAY).toISOString().slice(0, 10);
    buckets.set(day, { date: day, views: 0, likes: 0, followers });
  }
  for (const p of posts) {
    const day = p.publishedAt.toISOString().slice(0, 10);
    const b = buckets.get(day);
    if (b) {
      b.views += p.views;
      b.likes += p.likes;
    }
  }

  return {
    period: f.days,
    views: cur.views,
    viewsPrev: prev.views,
    likes: cur.likes,
    likesPrev: prev.likes,
    followers,
    followersGained: hasHistory ? followers - startState.followers : null,
    postsPublished: posts.length,
    postsPublishedPrev: prevPosts.length,
    totalViews: totals._sum.views ?? 0,
    accounts: accountsList.length,
    series: [...buckets.values()],
  };
}

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
  /** Vues des posts publiés sur la période. */
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
  const [accounts, snaps, postCounts] = await Promise.all([
    prisma.account.findMany({
      where,
      include: { creator: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.accountSnapshot.findMany({
      where: { account: where },
      orderBy: { capturedAt: "asc" },
      select: { accountId: true, capturedAt: true, followers: true, totalViews: true, totalLikes: true },
    }),
    prisma.post.groupBy({
      by: ["accountId"],
      where: { account: where, publishedAt: { gte: start } },
      _count: { _all: true },
      _sum: { views: true, likes: true },
    }),
  ]);
  const startState = stateAt(snaps, start).byAccount;
  const periodStats = new Map(postCounts.map((c) => [c.accountId, c]));
  const totalViewsByAccount = new Map(
    (await prisma.post.groupBy({ by: ["accountId"], where: { account: where }, _sum: { views: true } })).map((c) => [c.accountId, c._sum.views ?? 0]),
  );
  return accounts
    .map((a) => {
      const base = startState.get(a.id);
      const stats = periodStats.get(a.id);
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
        followersGained: base ? a.followers - base.followers : null,
        viewsInPeriod: stats?._sum.views ?? 0,
        likesInPeriod: stats?._sum.likes ?? 0,
        totalViews: totalViewsByAccount.get(a.id) ?? 0,
        postsInPeriod: stats?._count._all ?? 0,
        syncStatus: a.syncStatus,
        syncError: a.syncError,
        lastSyncedAt: a.lastSyncedAt,
        isActive: a.isActive,
      };
    })
    .sort((x, y) => y.viewsInPeriod - x.viewsInPeriod);
}

export type PostRow = {
  id: string;
  url: string;
  caption: string | null;
  thumbnailUrl: string | null;
  publishedAt: Date;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
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

export async function getTopPosts(
  f: Filters,
  opts: { limit?: number; sort?: PostSort; allTime?: boolean } = {},
): Promise<PostRow[]> {
  const { limit = 10, sort = "views", allTime = false } = opts;
  const start = new Date(Date.now() - f.days * DAY);
  const posts = await prisma.post.findMany({
    where: { account: accountWhere(f), ...(allTime ? {} : { publishedAt: { gte: start } }) },
    orderBy: sort === "recent" ? { publishedAt: "desc" } : sort === "likes" ? { likes: "desc" } : { views: "desc" },
    take: sort === "engagement" ? 500 : limit,
    include: {
      account: {
        select: { id: true, handle: true, platform: true, avatarUrl: true, ownership: true, creator: { select: { name: true } } },
      },
    },
  });
  if (sort === "engagement") {
    const er = (p: PostRow) => (p.likes + p.comments + p.shares + p.saves) / p.views;
    return posts
      .filter((p) => p.views >= 1000)
      .sort((a, b) => er(b) - er(a))
      .slice(0, limit);
  }
  return posts;
}

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

export async function getAccountDetail(workspaceId: string, accountId: string, days: Period) {
  const account = await prisma.account.findFirst({ where: { id: accountId, workspaceId }, include: { creator: true } });
  if (!account) return null;
  const f: Filters = { workspaceId, days, accountId };
  const [overview, posts] = await Promise.all([getOverview(f), getTopPosts(f, { limit: 60, sort: "recent", allTime: true })]);
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

/** Dernier rafraîchissement effectif (ajout de compte compris) + comptes en erreur. */
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
