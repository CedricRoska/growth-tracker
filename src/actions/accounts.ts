"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeHandle } from "@/lib/providers";
import { syncAccount, syncWorkspace } from "@/lib/sync";
import type { SyncMode } from "@/lib/providers";

export type ActionState = { error?: string; success?: string } | undefined;

const accountSchema = z.object({
  platform: z.enum(["TIKTOK", "INSTAGRAM"]),
  handle: z.string().min(1, "Handle requis").max(80),
  ownership: z.enum(["OWNED", "CREATOR"]),
  creatorId: z.string().optional(),
  newCreatorName: z.string().max(80).optional(),
});

export async function createAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { workspaceId } = await requireSession();
  const parsed = accountSchema.safeParse({
    platform: formData.get("platform"),
    handle: formData.get("handle"),
    ownership: formData.get("ownership"),
    creatorId: formData.get("creatorId") || undefined,
    newCreatorName: formData.get("newCreatorName") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const { platform, ownership } = parsed.data;
  const handle = normalizeHandle(parsed.data.handle);

  let creatorId: string | null = null;
  if (ownership === "CREATOR") {
    if (parsed.data.newCreatorName?.trim()) {
      const creator = await prisma.creator.create({ data: { workspaceId, name: parsed.data.newCreatorName.trim() } });
      creatorId = creator.id;
    } else if (parsed.data.creatorId) {
      const creator = await prisma.creator.findFirst({ where: { id: parsed.data.creatorId, workspaceId } });
      if (!creator) return { error: "Créateur introuvable" };
      creatorId = creator.id;
    } else {
      return { error: "Choisis un créateur ou saisis un nouveau nom" };
    }
  }

  const existing = await prisma.account.findUnique({ where: { workspaceId_platform_handle: { workspaceId, platform, handle } } });
  if (existing) return { error: `@${handle} est déjà suivi sur ${platform === "TIKTOK" ? "TikTok" : "Instagram"}` };

  const account = await prisma.account.create({ data: { workspaceId, platform, handle, ownership, creatorId } });
  // Premier import : on remonte l historique complet.
  const result = await syncAccount(account.id, { mode: "deep" });
  revalidatePath("/", "layout");
  if (!result.ok) return { success: `@${handle} ajouté, mais la première synchro a échoué : ${result.error}` };
  return { success: `@${handle} ajouté (${result.posts} posts récupérés)` };
}

export async function deleteAccount(accountId: string) {
  const { workspaceId } = await requireSession();
  await prisma.account.deleteMany({ where: { id: accountId, workspaceId } });
  revalidatePath("/", "layout");
  redirect("/accounts");
}

export async function toggleAccountActive(accountId: string) {
  const { workspaceId } = await requireSession();
  const account = await prisma.account.findFirst({ where: { id: accountId, workspaceId } });
  if (!account) return;
  await prisma.account.update({ where: { id: accountId }, data: { isActive: !account.isActive } });
  revalidatePath("/", "layout");
}

export async function syncOneAccount(accountId: string, mode: SyncMode = "quick") {
  const { workspaceId } = await requireSession();
  const account = await prisma.account.findFirst({ where: { id: accountId, workspaceId } });
  if (!account) return { ok: false, requests: 0, posts: 0, error: "Compte introuvable" };
  const result = await syncAccount(accountId, { mode });
  revalidatePath("/", "layout");
  // On renvoie l'erreur plutôt que de la lever : Next masque le message des exceptions en production.
  return { ok: result.ok, requests: result.requests, posts: result.posts, error: result.error };
}

export async function syncAllAccounts(mode: SyncMode = "quick") {
  const { workspaceId } = await requireSession();
  const { results, requests } = await syncWorkspace(workspaceId, "manual", mode);
  revalidatePath("/", "layout");
  const failed = results.filter((r) => !r.ok).length;
  return { requests, synced: results.length - failed, failed };
}
