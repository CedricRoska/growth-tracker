"use client";

import { Pause, Play, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteAccount, toggleAccountActive } from "@/actions/accounts";
import { Button } from "@/components/ui/button";

export function AccountActions({ accountId, handle, isActive }: { accountId: string; handle: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await toggleAccountActive(accountId);
            toast.success(isActive ? "Synchronisation mise en pause" : "Synchronisation réactivée");
          })
        }
      >
        {isActive ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        {isActive ? "Mettre en pause" : "Réactiver"}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Supprimer @${handle} et tout son historique ?`)) return;
          startTransition(() => deleteAccount(accountId));
        }}
      >
        <Trash2 className="size-3.5" />
        Supprimer
      </Button>
    </>
  );
}
