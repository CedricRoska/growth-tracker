import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OwnershipBadge, PlatformIcon } from "@/components/dashboard/platform-badge";
import { formatCompact, formatNumber, formatRelative } from "@/lib/format";
import type { AccountRow } from "@/lib/queries";
import { cn } from "@/lib/utils";

function Signed({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">–</span>;
  if (value === 0) return <span className="text-muted-foreground">0</span>;
  return (
    <span className={value > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
      {value > 0 ? "+" : ""}
      {formatCompact(value)}
    </span>
  );
}

function AccountCell({ a }: { a: AccountRow }) {
  return (
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
  );
}

const num = "text-right tabular-nums";

/**
 * `compact` (widget du dashboard) : vues gagnées, posts, followers.
 * Sinon : fiche complète, gagné sur la période à gauche, cumuls à droite.
 */
export function AccountsTable({ accounts, compact = false, periodLabel = "Sur la période" }: { accounts: AccountRow[]; compact?: boolean; periodLabel?: string }) {
  if (accounts.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun compte. Ajoute un premier compte TikTok ou Instagram.</p>;
  }

  if (compact) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Compte</TableHead>
            <TableHead className="text-right">Vues gagnées</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Posts</TableHead>
            <TableHead className="hidden text-right md:table-cell">Followers</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((a, i) => (
            <TableRow key={a.id} className={!a.isActive ? "opacity-50" : undefined}>
              <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
              <TableCell>
                <AccountCell a={a} />
              </TableCell>
              <TableCell className={cn(num, "font-medium")}>{formatCompact(a.viewsInPeriod)}</TableCell>
              <TableCell className={cn(num, "hidden sm:table-cell")}>{a.postsInPeriod}</TableCell>
              <TableCell className={cn(num, "hidden md:table-cell")}>
                {formatCompact(a.followers)} <span className="text-xs"><Signed value={a.followersGained} /></span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b-0">
          <TableHead colSpan={3} />
          <TableHead colSpan={4} className="border-l text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {periodLabel}
          </TableHead>
          <TableHead colSpan={4} className="hidden border-l text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">
            Total
          </TableHead>
          <TableHead className="hidden xl:table-cell" />
        </TableRow>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Compte</TableHead>
          <TableHead className="hidden md:table-cell">Type</TableHead>
          <TableHead className={cn(num, "border-l")}>Vues</TableHead>
          <TableHead className={num}>Likes</TableHead>
          <TableHead className={num}>Followers</TableHead>
          <TableHead className={num}>Posts</TableHead>
          <TableHead className={cn(num, "hidden border-l lg:table-cell")}>Vues</TableHead>
          <TableHead className={cn(num, "hidden lg:table-cell")}>Likes</TableHead>
          <TableHead className={cn(num, "hidden lg:table-cell")}>Followers</TableHead>
          <TableHead className={cn(num, "hidden lg:table-cell")}>Posts</TableHead>
          <TableHead className="hidden text-right xl:table-cell">Synchro</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((a, i) => (
          <TableRow key={a.id} className={!a.isActive ? "opacity-50" : undefined}>
            <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
            <TableCell>
              <AccountCell a={a} />
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <OwnershipBadge ownership={a.ownership} creatorName={a.creator?.name} />
            </TableCell>
            <TableCell className={cn(num, "border-l font-medium")}>{formatCompact(a.viewsInPeriod)}</TableCell>
            <TableCell className={num}>{formatCompact(a.likesInPeriod)}</TableCell>
            <TableCell className={num}>
              <Signed value={a.followersGained} />
            </TableCell>
            <TableCell className={num}>{a.postsInPeriod}</TableCell>
            <TableCell className={cn(num, "hidden border-l text-muted-foreground lg:table-cell")}>{formatCompact(a.totalViews)}</TableCell>
            <TableCell className={cn(num, "hidden text-muted-foreground lg:table-cell")}>{formatCompact(a.totalLikes)}</TableCell>
            <TableCell className={cn(num, "hidden text-muted-foreground lg:table-cell")} title={formatNumber(a.followers)}>
              {formatCompact(a.followers)}
            </TableCell>
            <TableCell className={cn(num, "hidden text-muted-foreground lg:table-cell")} title="Posts suivis par l’outil (30 derniers jours environ)">
              {a.totalPosts}
            </TableCell>
            <TableCell className="hidden text-right text-xs text-muted-foreground xl:table-cell">{formatRelative(a.lastSyncedAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
