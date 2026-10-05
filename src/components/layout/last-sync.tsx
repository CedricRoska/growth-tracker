import { Coins } from "lucide-react";
import { getSyncStatus } from "@/lib/queries";
import { syncSettings } from "@/lib/providers";
import { formatNumber, formatRelative } from "@/lib/format";
import { SyncButton } from "@/components/layout/sync-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * « Mis à jour il y a X » + crédits API restants + bouton Rafraîchir. Les données ne se
 * rafraîchissent qu'à la demande (comme PostHog) : ce composant est présent sur chaque page.
 */
export async function LastSync({ workspaceId }: { workspaceId: string }) {
  const { at, running, failed, credits, accounts } = await getSyncStatus(workspaceId);
  const quickDays = syncSettings("quick").lookbackDays;
  const deepDays = syncSettings("deep").lookbackDays;
  // Estimations : rapide ≈ 1-2 pages / compte ; complet ≈ 3-4 pages / compte (2 posts par jour).
  const quickCost = `${accounts}–${accounts * 2}`;
  const deepCost = `${accounts * 3}–${accounts * 4}`;
  const low = credits != null && credits < accounts * 2;

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
          <TooltipContent className="max-w-xs">
            Crédits API restants. Pour {accounts} compte{accounts > 1 ? "s" : ""} : rafraîchir ≈ {quickCost} crédits, rafraîchir complet ≈ {deepCost} crédits.
          </TooltipContent>
        </Tooltip>
      )}
      <SyncButton quickDays={quickDays} deepDays={deepDays} />
    </div>
  );
}
