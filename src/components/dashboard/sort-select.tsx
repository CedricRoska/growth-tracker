"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OPTIONS = [
  { value: "views", label: "Plus de vues" },
  { value: "likes", label: "Plus de likes" },
  { value: "engagement", label: "Meilleur engagement" },
  { value: "recent", label: "Plus récents" },
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const value = sp.get("sort") ?? "views";

  return (
    <Select
      items={OPTIONS}
      value={value}
      onValueChange={(v) => {
        const next = new URLSearchParams(sp.toString());
        next.set("sort", String(v));
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
