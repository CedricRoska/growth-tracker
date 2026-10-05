"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { createAccount, type ActionState } from "@/actions/accounts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Creator = { id: string; name: string };

const PLATFORM_ITEMS = [
  { value: "TIKTOK", label: "TikTok" },
  { value: "INSTAGRAM", label: "Instagram" },
];
const OWNERSHIP_ITEMS = [
  { value: "OWNED", label: "Compte interne (possédé par la marque)" },
  { value: "CREATOR", label: "Compte d’un créateur" },
];


export function AddAccountDialog({ creators }: { creators: Creator[] }) {
  const [open, setOpen] = useState(false);
  const [ownership, setOwnership] = useState<"OWNED" | "CREATOR">("OWNED");
  const [creatorMode, setCreatorMode] = useState<string>(creators[0]?.id ?? "__new");
  const [, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createAccount(prev, formData);
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
        Ajouter un compte
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={action} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Suivre un nouveau compte</DialogTitle>
            <DialogDescription>Le profil et ses posts récents sont récupérés immédiatement, puis chaque jour.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label>Plateforme</Label>
            <Select name="platform" defaultValue="TIKTOK" items={PLATFORM_ITEMS}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TIKTOK">TikTok</SelectItem>
                <SelectItem value="INSTAGRAM">Instagram</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="handle">Handle</Label>
            <Input id="handle" name="handle" placeholder="@loucio" required autoFocus />
          </div>

          <div className="grid gap-2">
            <Label>Type de compte</Label>
            <Select name="ownership" items={OWNERSHIP_ITEMS} value={ownership} onValueChange={(v) => setOwnership(v as "OWNED" | "CREATOR")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OWNED">Compte interne (possédé par la marque)</SelectItem>
                <SelectItem value="CREATOR">Compte d’un créateur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {ownership === "CREATOR" && (
            <div className="grid gap-2">
              <Label>Créateur</Label>
              <Select
                items={[...creators.map((c) => ({ value: c.id, label: c.name })), { value: "__new", label: "+ Nouveau créateur" }]}
                value={creatorMode}
                onValueChange={(v) => setCreatorMode(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {creators.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new">+ Nouveau créateur</SelectItem>
                </SelectContent>
              </Select>
              {creatorMode === "__new" ? (
                <Input name="newCreatorName" placeholder="Nom du créateur" required />
              ) : (
                <input type="hidden" name="creatorId" value={creatorMode} />
              )}
            </div>
          )}

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
