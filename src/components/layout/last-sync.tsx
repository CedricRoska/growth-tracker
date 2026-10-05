import { getSyncStatus } from "@/lib/queries";
import { formatRelative } from "@/lib/format";
import { SyncButton } from "@/components/layout/sync-button";

/**
 * « Mis à jour il y a X » + bouton Rafraîchir. Les données ne se rafraîchissent
 * qu'à la demande (comme PostHog) : ce composant est présent sur chaque page.
 */
export async function LastSync({ workspaceId }: { workspaceId: string }) {
  const { at, running, failed } = await getSyncStatus(workspaceId);
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline" title={at ? at.toLocaleString("fr-FR") : undefined}>
        {at ? `Mis à jour ${formatRelative(at)}` : "Jamais rafraîchi"}
        {running > 0 && " · en cours…"}
        {failed > 0 && <span className="text-destructive"> · {failed} compte{failed > 1 ? "s" : ""} en erreur</span>}
      </span>
      <SyncButton label="Rafraîchir" />
    </div>
  );
}
