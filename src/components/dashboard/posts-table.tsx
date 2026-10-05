import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlatformIcon } from "@/components/dashboard/platform-badge";
import { Thumb } from "@/components/dashboard/thumb";
import { engagementRate, formatCompact, formatDate, formatPercent } from "@/lib/format";
import type { PostRow } from "@/lib/queries";

type Props = {
  posts: PostRow[];
  showAccount?: boolean;
  /** Mode condensé (widgets du dashboard) : masque commentaires, partages et engagement. */
  compact?: boolean;
  emptyLabel?: string;
};

export function PostsTable({ posts, showAccount = true, compact = false, emptyLabel = "Aucun post sur cette période." }: Props) {
  if (posts.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Post</TableHead>
          {showAccount && <TableHead className="hidden md:table-cell">Compte</TableHead>}
          <TableHead className="hidden sm:table-cell">Publié</TableHead>
          <TableHead className="text-right">Vues</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Likes</TableHead>
          {!compact && <TableHead className="hidden text-right lg:table-cell">Comm.</TableHead>}
          {!compact && <TableHead className="hidden text-right lg:table-cell">Partages</TableHead>}
          {!compact && <TableHead className="hidden text-right md:table-cell">Engag.</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {posts.map((p, i) => (
          <TableRow key={p.id}>
            <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
            <TableCell className="max-w-[320px]">
              <a href={p.url} target="_blank" rel="noreferrer" className="group flex items-center gap-3">
                <Thumb src={p.thumbnailUrl} platform={p.account.platform} />
                <div className="min-w-0">
                  <p className="truncate text-sm group-hover:underline">{p.caption || "(sans légende)"}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <PlatformIcon platform={p.account.platform} className="size-3" />
                    <span className="sm:hidden">{formatDate(p.publishedAt)}</span>
                    <ExternalLink className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </p>
                </div>
              </a>
            </TableCell>
            {showAccount && (
              <TableCell className="hidden md:table-cell">
                <Link href={`/accounts/${p.account.id}`} className="text-sm hover:underline">
                  @{p.account.handle}
                </Link>
                {p.account.creator && <p className="text-xs text-muted-foreground">{p.account.creator.name}</p>}
              </TableCell>
            )}
            <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{formatDate(p.publishedAt)}</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatCompact(p.views)}</TableCell>
            <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatCompact(p.likes)}</TableCell>
            {!compact && <TableCell className="hidden text-right tabular-nums lg:table-cell">{formatCompact(p.comments)}</TableCell>}
            {!compact && <TableCell className="hidden text-right tabular-nums lg:table-cell">{formatCompact(p.shares)}</TableCell>}
            {!compact && <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">{formatPercent(engagementRate(p))}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
