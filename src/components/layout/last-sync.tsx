import { getLastSyncRun } from "@/lib/queries";
import { formatRelative } from "@/lib/format";
import { SyncButton } from "@/components/layout/sync-button";

/**
 * « Mis à jour il y a X » + bouton Synchroniser. Les données ne se rafraîchissent
 * qu'à la demande (comme PostHog) : ce composant est présent sur chaque page.
 */
export async function LastSync({ workspaceId }: { workspaceId: string }) {
  const run = await getLastSyncRun(workspaceId);
  const at = run?.finishedAt ?? run?.startedAt ?? null;
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline" title={at ? at.toLocaleString("fr-FR") : undefined}>
        {at ? `Mis à jour ${formatRelative(at)}` : "Jamais synchronisé"}
        {run?.status === "RUNNING" && " · en cours…"}
        {run?.accountsFailed ? ` · ${run.accountsFailed} erreur${run.accountsFailed > 1 ? "s" : ""}` : ""}
      </span>
      <SyncButton label="Rafraîchir" />
    </div>
  );
}
