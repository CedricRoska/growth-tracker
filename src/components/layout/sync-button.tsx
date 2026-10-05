"use client";

import { ChevronDown, History, RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { syncAllAccounts, syncOneAccount } from "@/actions/accounts";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { SyncMode } from "@/lib/providers";
import { cn } from "@/lib/utils";

type Props = {
  /** Si fourni, ne rafraîchit que ce compte. */
  accountId?: string;
  quickDays?: number;
  deepDays?: number;
};

/**
 * Bouton principal = rafraîchissement rapide (posts des derniers jours, 1 à 2 crédits par compte).
 * Menu = rafraîchissement complet (tout l'historique récent, plusieurs crédits par compte).
 */
export function SyncButton({ accountId, quickDays = 7, deepDays = 30 }: Props) {
  const [pending, startTransition] = useTransition();

  const run = (mode: SyncMode) =>
    startTransition(async () => {
      try {
        if (accountId) {
          const r = await syncOneAccount(accountId, mode);
          if (!r.ok) throw new Error(r.error ?? "Échec du rafraîchissement");
          toast.success(`Compte mis à jour (${r.posts} posts, ${r.requests} crédit${r.requests > 1 ? "s" : ""})`);
        } else {
          const r = await syncAllAccounts(mode);
          if (r.failed) toast.warning(`${r.synced} compte${r.synced > 1 ? "s" : ""} mis à jour, ${r.failed} en erreur (${r.requests} crédits)`);
          else toast.success(`${r.synced} compte${r.synced > 1 ? "s" : ""} mis à jour (${r.requests} crédit${r.requests > 1 ? "s" : ""})`);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Échec du rafraîchissement");
      }
    });

  return (
    <div className="inline-flex -space-x-px">
      <Button variant="outline" size="sm" className="rounded-r-none" onClick={() => run("quick")} disabled={pending} title={`Posts des ${quickDays} derniers jours`}>
        <RefreshCw className={cn("size-3.5", pending && "animate-spin")} />
        {pending ? "Mise à jour…" : "Rafraîchir"}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={pending}
          render={<Button variant="outline" size="sm" className="rounded-l-none px-1.5" aria-label="Autres options de rafraîchissement" />}
        >
          <ChevronDown className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => run("quick")}>
            <RefreshCw className="size-3.5" />
            <div className="grid">
              <span>Rafraîchir</span>
              <span className="text-xs text-muted-foreground">Posts des {quickDays} derniers jours · rapide, peu de crédits</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run("deep")}>
            <History className="size-3.5" />
            <div className="grid">
              <span>Rafraîchir complet</span>
              <span className="text-xs text-muted-foreground">Tous les posts des {deepDays} derniers jours · plusieurs crédits par compte</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
