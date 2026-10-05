/**
 * Seed de démo : workspace, utilisateurs, créateurs, comptes, et 45 jours d'historique
 * généré avec le provider mock (quel que soit SOCIAL_PROVIDER).
 *
 *   npx prisma db seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Platform } from "../src/generated/prisma/client";
import { MockProvider } from "../src/lib/providers/mock";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const mock = new MockProvider();
const DAY = 86_400_000;
const HISTORY_DAYS = 45;

type SeedAccount = { platform: Platform; handle: string; ownership: "OWNED" | "CREATOR"; creator?: string };

const CREATORS = [
  { name: "Emma R.", email: "emma@example.com", notes: "UGC lifestyle, 2 vidéos / semaine" },
  { name: "Yanis K.", email: "yanis@example.com", notes: "Clipper, paiement au 1000 vues" },
  { name: "Clara M.", email: null, notes: "Créatrice beauté" },
];

const ACCOUNTS: SeedAccount[] = [
  { platform: "TIKTOK", handle: "loucio", ownership: "OWNED" },
  { platform: "INSTAGRAM", handle: "loucio", ownership: "OWNED" },
  { platform: "TIKTOK", handle: "loucio.backstage", ownership: "OWNED" },
  { platform: "TIKTOK", handle: "emma.lifestyle", ownership: "CREATOR", creator: "Emma R." },
  { platform: "INSTAGRAM", handle: "emma.lifestyle", ownership: "CREATOR", creator: "Emma R." },
  { platform: "TIKTOK", handle: "yanis.clips", ownership: "CREATOR", creator: "Yanis K." },
  { platform: "TIKTOK", handle: "clara.essentials", ownership: "CREATOR", creator: "Clara M." },
  { platform: "INSTAGRAM", handle: "clara.essentials", ownership: "CREATOR", creator: "Clara M." },
];

async function main() {
  const name = process.env.SEED_WORKSPACE_NAME ?? "Loucio";
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const workspace = await prisma.workspace.upsert({ where: { slug }, update: {}, create: { name, slug } });
  console.log(`Workspace : ${workspace.name}`);

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@loucio.local").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: { email: adminEmail, name: "Admin", passwordHash, workspaceId: workspace.id },
  });
  console.log(`Utilisateur : ${adminEmail} / ${adminPassword}`);

  if (process.env.SEED_PARTNER_EMAIL) {
    const partnerEmail = process.env.SEED_PARTNER_EMAIL.toLowerCase();
    const partnerHash = await bcrypt.hash(process.env.SEED_PARTNER_PASSWORD ?? adminPassword, 10);
    await prisma.user.upsert({
      where: { email: partnerEmail },
      update: { passwordHash: partnerHash },
      create: { email: partnerEmail, name: "Associé", passwordHash: partnerHash, workspaceId: workspace.id },
    });
    console.log(`Utilisateur : ${partnerEmail}`);
  }

  // SEED_DEMO_DATA=false : on ne crée que le workspace et les utilisateurs (base de production).
  if (process.env.SEED_DEMO_DATA === "false") {
    console.log("Pas de données de démo (SEED_DEMO_DATA=false). Seed terminé ✔");
    return;
  }

  const creatorIds = new Map<string, string>();
  for (const c of CREATORS) {
    const existing = await prisma.creator.findFirst({ where: { workspaceId: workspace.id, name: c.name } });
    const creator = existing ?? (await prisma.creator.create({ data: { workspaceId: workspace.id, ...c } }));
    creatorIds.set(c.name, creator.id);
  }

  const now = new Date();
  for (const a of ACCOUNTS) {
    const exists = await prisma.account.findUnique({
      where: { workspaceId_platform_handle: { workspaceId: workspace.id, platform: a.platform, handle: a.handle } },
    });
    if (exists) {
      console.log(`  (déjà présent) ${a.platform} @${a.handle}`);
      continue;
    }
    const profile = await mock.getProfile(a.platform, a.handle);
    const account = await prisma.account.create({
      data: {
        workspaceId: workspace.id,
        platform: a.platform,
        handle: a.handle,
        ownership: a.ownership,
        creatorId: a.creator ? creatorIds.get(a.creator) : null,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        profileUrl: profile.profileUrl,
        bio: profile.bio,
        followers: profile.followers,
        syncStatus: "OK",
        lastSyncedAt: now,
        createdAt: new Date(now.getTime() - HISTORY_DAYS * DAY),
      },
    });

    // Historique : on recalcule l'état des posts à chaque jour passé.
    const todayPosts = await mock.getRecentPosts(a.platform, a.handle, { limit: 400, asOf: now });
    await prisma.post.createMany({
      data: todayPosts.map((p) => ({ accountId: account.id, ...p, lastSyncedAt: now })),
    });
    const ids = new Map((await prisma.post.findMany({ where: { accountId: account.id }, select: { id: true, externalId: true } })).map((p) => [p.externalId, p.id]));

    const postSnapshots = [];
    const accountSnapshots = [];
    for (let d = HISTORY_DAYS; d >= 0; d--) {
      const capturedAt = new Date(now.getTime() - d * DAY);
      const posts = await mock.getRecentPosts(a.platform, a.handle, { limit: 400, asOf: capturedAt });
      let totalViews = 0;
      let totalLikes = 0;
      for (const p of posts) {
        const postId = ids.get(p.externalId);
        if (!postId) continue;
        totalViews += p.views;
        totalLikes += p.likes;
        postSnapshots.push({ postId, capturedAt, views: p.views, likes: p.likes, comments: p.comments, shares: p.shares, saves: p.saves });
      }
      // Followers : croissance ~ proportionnelle aux vues cumulées.
      const ratio = Math.max(0, 1 - (d / HISTORY_DAYS) * 0.18);
      accountSnapshots.push({ accountId: account.id, capturedAt, followers: Math.round(profile.followers * ratio), totalViews, totalLikes, totalPosts: posts.length });
    }
    await prisma.postSnapshot.createMany({ data: postSnapshots });
    await prisma.accountSnapshot.createMany({ data: accountSnapshots });
    console.log(`  + ${a.platform} @${a.handle} : ${todayPosts.length} posts, ${postSnapshots.length} snapshots`);
  }

  await prisma.syncRun.create({
    data: { workspaceId: workspace.id, finishedAt: now, status: "OK", accountsSynced: ACCOUNTS.length, trigger: "seed" },
  });
  console.log("Seed terminé ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
