"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PERIODS } from "@/lib/periods";
import { cn } from "@/lib/utils";

type Creator = { id: string; name: string };
type Item = { value: string; label: string };

const PLATFORM_ITEMS: Item[] = [
  { value: "all", label: "Toutes plateformes" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "INSTAGRAM", label: "Instagram" },
];

const OWNERSHIP_ITEMS: Item[] = [
  { value: "all", label: "Tous les comptes" },
  { value: "OWNED", label: "Comptes internes" },
  { value: "CREATOR", label: "Créateurs" },
];

function FilterSelect({ items, value, onChange, width }: { items: Item[]; value: string; onChange: (v: string) => void; width: string }) {
  return (
    <Select items={items} value={value} onValueChange={(v) => onChange(String(v))}>
      <SelectTrigger className={width}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((it) => (
          <SelectItem key={it.value} value={it.value}>
            {it.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type Props = { creators?: Creator[]; showOwnership?: boolean; showPlatform?: boolean; className?: string };

export function Filters({ creators = [], showOwnership = true, showPlatform = true, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const days = sp.get("days") ?? "7";
  const creatorItems: Item[] = [{ value: "all", label: "Tous les créateurs" }, ...creators.map((c) => ({ value: c.id, label: c.name }))];

  return (
    <div className={cn("flex flex-wrap items-center gap-2", pending && "opacity-70", className)}>
      <Tabs value={days} onValueChange={(v) => set("days", String(v))}>
        <TabsList>
          {PERIODS.map((p) => (
            <TabsTrigger key={p} value={String(p)}>
              {p} j
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {showPlatform && <FilterSelect items={PLATFORM_ITEMS} value={sp.get("platform") ?? "all"} onChange={(v) => set("platform", v)} width="w-[170px]" />}
      {showOwnership && <FilterSelect items={OWNERSHIP_ITEMS} value={sp.get("ownership") ?? "all"} onChange={(v) => set("ownership", v)} width="w-[170px]" />}
      {creators.length > 0 && <FilterSelect items={creatorItems} value={sp.get("creator") ?? "all"} onChange={(v) => set("creator", v)} width="w-[170px]" />}
    </div>
  );
}
