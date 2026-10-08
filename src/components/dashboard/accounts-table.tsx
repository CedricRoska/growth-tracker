import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OwnershipBadge, PlatformIcon } from "@/components/dashboard/platform-badge";
import { formatCompact, formatRelative } from "@/lib/format";
import type { AccountRow } from "@/lib/queries";

export function AccountsTable({ accounts, compact = false }: { accounts: AccountRow[]; compact?: boolean }) {
  if (accounts.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun compte. Ajoute un premier compte TikTok ou Instagram.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Compte</TableHead>
          {!compact && <TableHead className="hidden md:table-cell">Type</TableHead>}
          <TableHead className="text-right">Vues gagnées</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Posts</TableHead>
          <TableHead className="hidden text-right md:table-cell">Followers</TableHead>
          {!compact && <TableHead className="hidden text-right lg:table-cell">Synchro</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((a, i) => (
          <TableRow key={a.id} className={!a.isActive ? "opacity-50" : undefined}>
            <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
            <TableCell>
              <Link href={`/accounts/${a.id}`} className="flex items-center gap-3 hover:underline">
                <Avatar className="size-8">
                  <AvatarImage src={a.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback>{a.handle.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <PlatformIcon platform={a.platform} className={a.platform === "INSTAGRAM" ? "text-pink-600 dark:text-pink-400" : ""} />
                    @{a.handle}
                    {a.syncStatus === "ERROR" && (
                      <Tooltip>
                        <TooltipTrigger render={<span className="inline-flex" />}>
                          <AlertCircle className="size-3.5 text-destructive" />
                        </TooltipTrigger>
                        <TooltipContent>{a.syncError ?? "Erreur de synchronisation"}</TooltipContent>
                      </Tooltip>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{a.displayName ?? (a.creator?.name ?? "")}</p>
                </div>
              </Link>
            </TableCell>
            {!compact && (
              <TableCell className="hidden md:table-cell">
                <OwnershipBadge ownership={a.ownership} creatorName={a.creator?.name} />
              </TableCell>
            )}
            <TableCell className="text-right font-medium tabular-nums">{formatCompact(a.viewsInPeriod)}</TableCell>
            <TableCell className="hidden text-right tabular-nums sm:table-cell">{a.postsInPeriod}</TableCell>
            <TableCell className="hidden text-right tabular-nums md:table-cell">
              {formatCompact(a.followers)}
              {a.followersGained != null && a.followersGained !== 0 && (
                <span className={`ml-1 text-xs ${a.followersGained > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"}`}>
                  {a.followersGained > 0 ? "+" : ""}
                  {formatCompact(a.followersGained)}
                </span>
              )}
            </TableCell>
            {!compact && <TableCell className="hidden text-right text-xs text-muted-foreground lg:table-cell">{formatRelative(a.lastSyncedAt)}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
