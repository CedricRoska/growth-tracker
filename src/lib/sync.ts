import { prisma } from "@/lib/prisma";
import { getSocialProvider, normalizeHandle, type PostData } from "@/lib/providers";

export type SyncAccountResult = { accountId: string; ok: boolean; posts: number; error?: string };

/**
 * Synchronise un compte : profil + posts récents, upsert des posts,
 * puis snapshot du compte et de chaque post (base des deltas quotidiens).
 */
export async function syncAccount(accountId: string, asOf?: Date): Promise<SyncAccountResult> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return { accountId, ok: false, posts: 0, error: "Compte introuvable" };

  const provider = getSocialProvider();
  await prisma.account.update({ where: { id: accountId }, data: { syncStatus: "RUNNING", syncError: null } });

  try {
    const [profile, posts] = await Promise.all([
      provider.getProfile(account.platform, account.handle),
      provider.getRecentPosts(account.platform, account.handle, { limit: 50, asOf }),
    ]);
    const capturedAt = asOf ?? new Date();

    await prisma.$transaction(async (tx) => {
      for (const p of posts) {
        await upsertPost(tx, account.id, p, capturedAt);
      }
      const agg = await tx.post.aggregate({
        where: { accountId: account.id },
        _sum: { views: true, likes: true },
        _count: { _all: true },
      });
      await tx.accountSnapshot.create({
        data: {
          accountId: account.id,
          capturedAt,
          followers: profile.followers,
          totalViews: agg._sum.views ?? 0,
          totalLikes: agg._sum.likes ?? 0,
          totalPosts: agg._count._all,
        },
      });
      await tx.account.update({
        where: { id: account.id },
        data: {
          displayName: profile.displayName ?? account.displayName,
          avatarUrl: profile.avatarUrl ?? account.avatarUrl,
          profileUrl: profile.profileUrl,
          bio: profile.bio ?? account.bio,
          followers: profile.followers,
          syncStatus: "OK",
          syncError: null,
          lastSyncedAt: capturedAt,
        },
      });
    });

    return { accountId, ok: true, posts: posts.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.account.update({
      where: { id: accountId },
      data: { syncStatus: "ERROR", syncError: message.slice(0, 500), lastSyncedAt: new Date() },
    });
    return { accountId, ok: false, posts: 0, error: message };
  }
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function upsertPost(tx: Tx, accountId: string, p: PostData, capturedAt: Date) {
  const metrics = { views: p.views, likes: p.likes, comments: p.comments, shares: p.shares, saves: p.saves };
  const post = await tx.post.upsert({
    where: { accountId_externalId: { accountId, externalId: p.externalId } },
    create: {
      accountId,
      externalId: p.externalId,
      url: p.url,
      caption: p.caption,
      thumbnailUrl: p.thumbnailUrl,
      publishedAt: p.publishedAt,
      lastSyncedAt: capturedAt,
      ...metrics,
    },
    update: {
      url: p.url,
      caption: p.caption ?? undefined,
      thumbnailUrl: p.thumbnailUrl ?? undefined,
      lastSyncedAt: capturedAt,
      ...metrics,
    },
  });
  await tx.postSnapshot.create({ data: { postId: post.id, capturedAt, ...metrics } });
}

/** Synchronise tous les comptes actifs d'un workspace, séquentiellement (respect des quotas API). */
export async function syncWorkspace(workspaceId: string, trigger = "manual") {
  const run = await prisma.syncRun.create({ data: { workspaceId, trigger } });
  const accounts = await prisma.account.findMany({ where: { workspaceId, isActive: true }, select: { id: true } });
  const results: SyncAccountResult[] = [];
  for (const a of accounts) {
    results.push(await syncAccount(a.id));
  }
  const failed = results.filter((r) => !r.ok);
  await prisma.syncRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      status: failed.length === results.length && results.length > 0 ? "ERROR" : "OK",
      accountsSynced: results.length - failed.length,
      accountsFailed: failed.length,
      error: failed.length ? failed.map((f) => f.error).join(" | ").slice(0, 1000) : null,
    },
  });
  return { runId: run.id, results };
}

export { normalizeHandle };
