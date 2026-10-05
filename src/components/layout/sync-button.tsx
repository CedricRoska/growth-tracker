"use client";

import { RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { syncAllAccounts, syncOneAccount } from "@/actions/accounts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SyncButton({ accountId, label = "Rafraîchir", size = "sm" }: { accountId?: string; label?: string; size?: "sm" | "default" | "xs" }) {
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      try {
        if (accountId) await syncOneAccount(accountId);
        else await syncAllAccounts();
        toast.success(accountId ? "Compte mis à jour" : "Données mises à jour");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Échec du rafraîchissement");
      }
    });

  return (
    <Button variant="outline" size={size} onClick={run} disabled={pending}>
      <RefreshCw className={cn("size-3.5", pending && "animate-spin")} />
      {pending ? "Mise à jour…" : label}
    </Button>
  );
}
