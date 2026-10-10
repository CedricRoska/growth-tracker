import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireSession } from "@/auth";
import { AccountActions } from "@/components/accounts/account-actions";
import { Filters } from "@/components/dashboard/filters";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { OwnershipBadge, PlatformBadge } from "@/components/dashboard/platform-badge";
import { PostsTable } from "@/components/dashboard/posts-table";
import { ViewsChart } from "@/components/dashboard/views-chart";
import { PageHeader } from "@/components/layout/page-header";
import { SyncButton } from "@/components/layout/sync-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompact, formatNumber, formatRelative } from "@/lib/format";
import { getAccountDetail, parseFilters, type SearchParams } from "@/lib/queries";

export default async function AccountPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const { workspaceId } = await requireSession();
  const { id } = await params;
  const { days } = parseFilters(workspaceId, await searchParams);
  const detail = await getAccountDetail(workspaceId, id, days);
  if (!detail) notFound();
  const { account, overview, posts } = detail;

  return (
    <>
      <PageHeader title={`@${account.handle}`} description={account.displayName ?? undefined}>
        <Filters showOwnership={false} showPlatform={false} />
        <SyncButton accountId={account.id} />
        <AccountActions accountId={account.id} handle={account.handle} isActive={account.isActive} />
      </PageHeader>

      <div className="flex flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={account.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="text-lg">{account.handle.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{account.displayName ?? `@${account.handle}`}</h2>
                <PlatformBadge platform={account.platform} />
                <OwnershipBadge ownership={account.ownership} creatorName={account.creator?.name} />
                {!account.isActive && <Badge variant="secondary">En pause</Badge>}
                {account.syncStatus === "ERROR" && <Badge variant="destructive">Erreur de synchro</Badge>}
              </div>
              {account.bio && <p className="mt-1 text-sm text-muted-foreground">{account.bio}</p>}
              <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>{formatNumber(account.followers)} followers</span>
                <span>Dernière synchro {formatRelative(account.lastSyncedAt)}</span>
                {account.profileUrl && (
                  <a href={account.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                    Ouvrir le profil <ExternalLink className="size-3" />
                  </a>
                )}
                {account.creator && (
                  <Link href={`/creators`} className="hover:underline">
                    Créateur : {account.creator.name}
                  </Link>
                )}
              </p>
              {account.syncError && <p className="mt-2 text-xs text-destructive">{account.syncError}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={`Vues gagnées sur ${days} j`} value={overview.views} previous={overview.viewsPrev} hint={overview.syncsInPeriod < 2 ? "rafraîchis au moins 2 fois sur la période pour affiner" : `${overview.viewsPrev ? "vs période précédente" : "pas encore de période précédente"} · ${formatCompact(overview.totalViews)} au total`} />
          <KpiCard title={`Likes gagnés sur ${days} j`} value={overview.likes} previous={overview.likesPrev} hint={`${overview.likesPrev ? "vs période précédente" : "pas encore de période précédente"} · ${formatCompact(overview.totalLikes)} au total`} />
          <KpiCard
            title={`Followers gagnés sur ${days} j`}
            value={overview.followersGained ?? 0}
            previous={overview.followersGainedPrev ?? undefined}
            format={(n: number) => `${n > 0 ? "+" : ""}${formatCompact(n)}`}
            hint={`${formatCompact(overview.followers)} au total`}
          />
          <KpiCard title={`Posts publiés sur ${days} j`} value={overview.postsPublished} previous={overview.postsPublishedPrev} format={formatNumber} hint={`vs période précédente · ${overview.totalPosts} posts suivis`} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vues gagnées par jour</CardTitle>
            <CardDescription>Vues reçues chaque jour par l’ensemble des posts du compte.</CardDescription>
          </CardHeader>
          <CardContent>
            <ViewsChart data={overview.series} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Posts</CardTitle>
            <CardDescription>{posts.length} posts suivis, du plus récent au plus ancien.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <PostsTable posts={posts} showAccount={false} emptyLabel="Aucun post récupéré pour ce compte." />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
