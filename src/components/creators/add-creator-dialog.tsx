"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/actions/accounts";
import { createCreator, deleteCreator } from "@/actions/creators";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddCreatorDialog() {
  const [open, setOpen] = useState(false);
  const [, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createCreator(prev, formData);
    if (result?.success) {
      toast.success(result.success);
      setOpen(false);
    } else if (result?.error) {
      toast.error(result.error);
    }
    return result;
  }, undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-3.5" />
        Nouveau créateur
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={action} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Ajouter un créateur</DialogTitle>
            <DialogDescription>Une personne externe qui gère un ou plusieurs comptes pour la marque.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" name="name" required autoFocus placeholder="Emma R." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email (optionnel)</Label>
            <Input id="email" name="email" type="email" placeholder="emma@exemple.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Input id="notes" name="notes" placeholder="Deal, rythme de publication…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Ajout…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteCreatorButton({ creatorId, name, accounts }: { creatorId: string; name: string; accounts: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      aria-label={`Supprimer ${name}`}
      onClick={() => {
        const msg = accounts > 0 ? `Supprimer ${name} ? Ses ${accounts} compte(s) resteront suivis mais sans créateur associé.` : `Supprimer ${name} ?`;
        if (!confirm(msg)) return;
        startTransition(async () => {
          await deleteCreator(creatorId);
          toast.success(`${name} supprimé`);
        });
      }}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
