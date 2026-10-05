import { prisma } from "@/lib/prisma";
import { getSocialProvider, normalizeHandle, syncSettings, type PostData, type ProfileData, type SyncMode } from "@/lib/providers";

export type SyncAccountResult = { accountId: string; ok: boolean; posts: number; requests: number; error?: string };
export type SyncOptions = { mode?: SyncMode; asOf?: Date };

const PROFILE_MAX_AGE = 24 * 3_600_000;

/**
 * Synchronise un compte : posts récents (paginés), profil si nécessaire, upsert des posts,
 * puis snapshot du compte et de chaque post (base de l'historique followers).
 *
 * Économie de crédits : le profil n'est redemandé que s'il n'est pas déjà dans la réponse
 * des posts (TikTok le fournit), et au plus une fois par 24 h (Instagram).
 */
export async function syncAccount(accountId: string, { mode = "quick", asOf }: SyncOptions = {}): Promise<SyncAccountResult> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return { accountId, ok: false, posts: 0, requests: 0, error: "Compte introuvable" };

  const provider = getSocialProvider();
  await prisma.account.update({ where: { id: accountId }, data: { syncStatus: "RUNNING", syncError: null } });

  try {
    const result = await provider.getRecentPosts(account.platform, account.handle, { ...syncSettings(mode), asOf });
    let requests = result.requests;
    let profile: ProfileData | null = result.profile ?? null;
    const profileStale = !account.lastSyncedAt || account.followers === 0 || Date.now() - account.lastSyncedAt.getTime() > PROFILE_MAX_AGE;
    if (!profile && profileStale) {
      profile = await provider.getProfile(account.platform, account.handle);
      requests += 1;
    }
    const capturedAt = asOf ?? new Date();

    await prisma.$transaction(async (tx) => {
      for (const p of result.posts) {
        await upsertPost(tx, account.id, p, capturedAt);
      }
      const agg = await tx.post.aggregate({
        where: { accountId: account.id },
        _sum: { views: true, likes: true },
        _count: { _all: true },
      });
      const followers = profile?.followers ?? account.followers;
      await tx.accountSnapshot.create({
        data: {
          accountId: account.id,
          capturedAt,
          followers,
          totalViews: agg._sum.views ?? 0,
          totalLikes: agg._sum.likes ?? 0,
          totalPosts: agg._count._all,
        },
      });
      await tx.account.update({
        where: { id: account.id },
        data: {
          ...(profile
            ? {
                displayName: profile.displayName ?? account.displayName,
                avatarUrl: profile.avatarUrl ?? account.avatarUrl,
                profileUrl: profile.profileUrl,
                bio: profile.bio ?? account.bio,
                followers: profile.followers,
              }
            : {}),
          syncStatus: "OK",
          syncError: null,
          lastSyncedAt: capturedAt,
        },
      });
      if (result.creditsRemaining != null) {
        await tx.workspace.update({
          where: { id: account.workspaceId },
          data: { providerCredits: result.creditsRemaining, providerCreditsAt: capturedAt },
        });
      }
    });

    return { accountId, ok: true, posts: result.posts.length, requests };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.account.update({
      where: { id: accountId },
      data: { syncStatus: "ERROR", syncError: message.slice(0, 500), lastSyncedAt: new Date() },
    });
    return { accountId, ok: false, posts: 0, requests: 0, error: message };
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
export async function syncWorkspace(workspaceId: string, trigger = "manual", mode: SyncMode = "quick") {
  const run = await prisma.syncRun.create({ data: { workspaceId, trigger: `${trigger}-${mode}` } });
  const accounts = await prisma.account.findMany({ where: { workspaceId, isActive: true }, select: { id: true } });
  const results: SyncAccountResult[] = [];
  for (const a of accounts) {
    results.push(await syncAccount(a.id, { mode }));
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
  return { runId: run.id, results, requests: results.reduce((s, r) => s + r.requests, 0) };
}

export { normalizeHandle };
