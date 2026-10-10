import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireSession } from "@/auth";
import { AccountsTable } from "@/components/dashboard/accounts-table";
import { Filters } from "@/components/dashboard/filters";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PostsTable } from "@/components/dashboard/posts-table";
import { ViewsChart } from "@/components/dashboard/views-chart";
import { LastSync } from "@/components/layout/last-sync";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCompact, formatNumber } from "@/lib/format";
import { getAccountsLeaderboard, getCreators, getOverview, getTopPosts, parseFilters, type SearchParams } from "@/lib/queries";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { workspaceId } = await requireSession();
  const filters = parseFilters(workspaceId, await searchParams);
  const [overview, accounts, topPosts, creators] = await Promise.all([
    getOverview(filters),
    getAccountsLeaderboard(filters),
    getTopPosts(filters, { limit: 8 }),
    getCreators(workspaceId),
  ]);

  return (
    <>
      <PageHeader title="Dashboard" description={`Performances des ${overview.period} derniers jours`}>
        <Filters creators={creators} />
        <LastSync workspaceId={workspaceId} />
      </PageHeader>

      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={`Vues gagnées sur ${overview.period} j`} value={overview.views} previous={overview.viewsPrev} hint={overview.syncsInPeriod < 2 ? "rafraîchis au moins 2 fois sur la période pour affiner" : `${overview.viewsPrev ? "vs période précédente" : "pas encore de période précédente"} · ${formatCompact(overview.totalViews)} au total`} />
          <KpiCard title={`Likes gagnés sur ${overview.period} j`} value={overview.likes} previous={overview.likesPrev} hint={`${overview.likesPrev ? "vs période précédente" : "pas encore de période précédente"} · ${formatCompact(overview.totalLikes)} au total`} />
          <KpiCard
            title={`Followers gagnés sur ${overview.period} j`}
            value={overview.followersGained ?? 0}
            previous={overview.followersGainedPrev ?? undefined}
            format={(n: number) => `${n > 0 ? "+" : ""}${formatCompact(n)}`}
            hint={`${overview.followersGainedPrev == null ? "pas encore de période précédente · " : "vs période précédente · "}${formatCompact(overview.followers)} au total`}
          />
          <KpiCard title={`Posts publiés sur ${overview.period} j`} value={overview.postsPublished} previous={overview.postsPublishedPrev} format={formatNumber} hint={`vs période précédente · ${overview.accounts} compte${overview.accounts > 1 ? "s" : ""} suivi${overview.accounts > 1 ? "s" : ""}`} />
        </div>

        <Card>
          <Tabs defaultValue="views">
            <CardHeader>
              <CardTitle>Vues gagnées par jour</CardTitle>
              <CardDescription>Chaque vue est comptée le jour où elle arrive, quel que soit l’âge du post. Répartition estimée entre deux rafraîchissements.</CardDescription>
              <CardAction>
                <TabsList>
                  <TabsTrigger value="views">Vues</TabsTrigger>
                  <TabsTrigger value="likes">Likes</TabsTrigger>
                </TabsList>
              </CardAction>
            </CardHeader>
            <CardContent>
              <TabsContent value="views">
                <ViewsChart data={overview.series} metric="views" />
              </TabsContent>
              <TabsContent value="likes">
                <ViewsChart data={overview.series} metric="likes" />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <div className="grid gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle>Top posts</CardTitle>
              <CardDescription>Classés par vues gagnées sur la période.</CardDescription>
              <CardAction>
                <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/posts" />}>
                  Tout voir <ArrowRight className="size-3.5" />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              <PostsTable posts={topPosts} compact />
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Top comptes</CardTitle>
              <CardDescription>Par vues gagnées sur la période.</CardDescription>
              <CardAction>
                <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/accounts" />}>
                  Tout voir <ArrowRight className="size-3.5" />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              <AccountsTable accounts={accounts.slice(0, 6)} compact />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
