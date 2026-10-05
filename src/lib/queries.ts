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

export type Overview = {
  period: Period;
  viewsGained: number;
  viewsGainedPrev: number;
  likesGained: number;
  likesGainedPrev: number;
  followers: number;
  followersGained: number;
  followersGainedPrev: number;
  postsPublished: number;
  postsPublishedPrev: number;
  totalViews: number;
  accounts: number;
  series: SeriesPoint[];
};

export async function getOverview(f: Filters): Promise<Overview> {
  const now = new Date();
  const start = new Date(now.getTime() - f.days * DAY);
  const prevStart = new Date(start.getTime() - f.days * DAY);
  const where = accountWhere(f);

  const [snaps, postsPublished, postsPublishedPrev, accounts, totals] = await Promise.all([
    prisma.accountSnapshot.findMany({
      where: { account: where },
      orderBy: { capturedAt: "asc" },
      select: { accountId: true, capturedAt: true, followers: true, totalViews: true, totalLikes: true },
    }),
    prisma.post.count({ where: { account: where, publishedAt: { gte: start } } }),
    prisma.post.count({ where: { account: where, publishedAt: { gte: prevStart, lt: start } } }),
    prisma.account.count({ where }),
    prisma.post.aggregate({ where: { account: where }, _sum: { views: true } }),
  ]);

  const nowState = stateAt(snaps, now);
  const startState = stateAt(snaps, start);
  const prevState = stateAt(snaps, prevStart);

  // Série journalière : état cumulé à la fin de chaque jour, puis delta jour/jour.
  const series: SeriesPoint[] = [];
  let prevDay = stateAt(snaps, start);
  for (let i = 1; i <= f.days; i++) {
    const dayEnd = new Date(start.getTime() + i * DAY);
    const st = stateAt(snaps, dayEnd);
    series.push({
      date: dayEnd.toISOString().slice(0, 10),
      views: Math.max(0, st.views - prevDay.views),
      likes: Math.max(0, st.likes - prevDay.likes),
      followers: st.followers,
    });
    prevDay = st;
  }

  return {
    period: f.days,
    viewsGained: Math.max(0, nowState.views - startState.views),
    viewsGainedPrev: Math.max(0, startState.views - prevState.views),
    likesGained: Math.max(0, nowState.likes - startState.likes),
    likesGainedPrev: Math.max(0, startState.likes - prevState.likes),
    followers: nowState.followers,
    followersGained: nowState.followers - startState.followers,
    followersGainedPrev: startState.followers - prevState.followers,
    postsPublished,
    postsPublishedPrev,
    totalViews: totals._sum.views ?? 0,
    accounts,
    series,
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
  followersGained: number;
  viewsGained: number;
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
    }),
  ]);
  const nowState = stateAt(snaps, now).byAccount;
  const startState = stateAt(snaps, start).byAccount;
  const counts = new Map(postCounts.map((c) => [c.accountId, c._count._all]));
  return accounts
    .map((a) => {
      const cur = nowState.get(a.id);
      const base = startState.get(a.id);
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
        followersGained: (cur?.followers ?? a.followers) - (base?.followers ?? 0),
        viewsGained: Math.max(0, (cur?.totalViews ?? 0) - (base?.totalViews ?? 0)),
        totalViews: cur?.totalViews ?? 0,
        postsInPeriod: counts.get(a.id) ?? 0,
        syncStatus: a.syncStatus,
        syncError: a.syncError,
        lastSyncedAt: a.lastSyncedAt,
        isActive: a.isActive,
      };
    })
    .sort((x, y) => y.viewsGained - x.viewsGained);
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
  viewsGained: number;
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
      viewsGained: 0,
      postsInPeriod: 0,
      platforms: [],
    };
    g.accounts += 1;
    g.followers += r.followers;
    g.viewsGained += r.viewsGained;
    g.postsInPeriod += r.postsInPeriod;
    if (!g.platforms.includes(r.platform)) g.platforms.push(r.platform);
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.viewsGained - a.viewsGained);
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
