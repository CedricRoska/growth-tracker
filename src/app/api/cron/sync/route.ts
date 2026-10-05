import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncWorkspace } from "@/lib/sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Appelé par Vercel Cron (voir vercel.json). Protégé par CRON_SECRET.
 * Test local : curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspaces = await prisma.workspace.findMany({ select: { id: true, slug: true } });
  const summary = [];
  for (const ws of workspaces) {
    const { results } = await syncWorkspace(ws.id, "cron");
    summary.push({ workspace: ws.slug, synced: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length });
  }
  return NextResponse.json({ ok: true, at: new Date().toISOString(), summary });
}
