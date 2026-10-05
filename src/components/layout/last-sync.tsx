import { Coins } from "lucide-react";
import { getSyncStatus } from "@/lib/queries";
import { formatNumber, formatRelative } from "@/lib/format";
import { SyncButton } from "@/components/layout/sync-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * « Mis à jour il y a X » + crédits API restants + bouton Rafraîchir. Les données ne se
 * rafraîchissent qu'à la demande (comme PostHog) : ce composant est présent sur chaque page.
 */
export async function LastSync({ workspaceId }: { workspaceId: string }) {
  const { at, running, failed, credits, accounts } = await getSyncStatus(workspaceId);
  const low = credits != null && credits < accounts * 4;
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline" title={at ? at.toLocaleString("fr-FR") : undefined}>
        {at ? `Mis à jour ${formatRelative(at)}` : "Jamais rafraîchi"}
        {running > 0 && " · en cours…"}
        {failed > 0 && <span className="text-destructive"> · {failed} compte{failed > 1 ? "s" : ""} en erreur</span>}
      </span>
      {credits != null && (
        <Tooltip>
          <TooltipTrigger
            render={<span className={`hidden items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs tabular-nums md:inline-flex ${low ? "border-destructive/40 text-destructive" : "text-muted-foreground"}`} />}
          >
            <Coins className="size-3" />
            {formatNumber(credits)}
          </TooltipTrigger>
          <TooltipContent>
            Crédits API restants. Un rafraîchissement complet coûte environ {accounts * 3} à {accounts * 4} crédits pour {accounts} compte{accounts > 1 ? "s" : ""}.
          </TooltipContent>
        </Tooltip>
      )}
      <SyncButton label="Rafraîchir" />
    </div>
  );
}
