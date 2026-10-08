import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncWorkspace } from "@/lib/sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Rafraîchissement planifié, appelé par Vercel Cron (voir vercel.json) :
 * - tous les matins en mode `quick` (posts des 7 derniers jours, 1 à 2 crédits par compte) ;
 * - le lundi en mode `deep` (30 jours, 3 à 4 crédits par compte).
 * Le bouton « Rafraîchir » de l'interface reste utilisable à tout moment.
 *
 * Protégé par CRON_SECRET (Vercel envoie automatiquement `Authorization: Bearer <secret>`).
 * Test local : curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/sync?mode=quick"
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const modeParam = new URL(request.url).searchParams.get("mode");
  const mode = modeParam === "deep" ? "deep" : "quick";

  const startedAt = Date.now();
  const workspaces = await prisma.workspace.findMany({ select: { id: true, slug: true } });
  const summary = [];
  for (const ws of workspaces) {
    const { results, requests } = await syncWorkspace(ws.id, "cron", mode);
    summary.push({
      workspace: ws.slug,
      synced: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      credits: requests,
      errors: results.filter((r) => !r.ok).map((r) => r.error).slice(0, 5),
    });
  }
  return NextResponse.json({ ok: true, mode, at: new Date().toISOString(), durationMs: Date.now() - startedAt, summary });
}
