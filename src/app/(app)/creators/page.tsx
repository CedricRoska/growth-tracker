import { redirect } from "next/navigation";
import { requireSession } from "@/auth";
import { AddCreatorDialog, DeleteCreatorButton } from "@/components/creators/add-creator-dialog";
import { Filters } from "@/components/dashboard/filters";
import { PlatformIcon } from "@/components/dashboard/platform-badge";
import { LastSync } from "@/components/layout/last-sync";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCompact } from "@/lib/format";
import { getCreators, getCreatorsLeaderboard, getWorkspace, parseFilters, type SearchParams } from "@/lib/queries";

export const metadata = { title: "Créateurs" };

export default async function CreatorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { workspaceId } = await requireSession();
  const filters = parseFilters(workspaceId, await searchParams);
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) redirect("/login");
  const [leaderboard, creators] = await Promise.all([getCreatorsLeaderboard(filters, workspace.name), getCreators(workspaceId)]);

  return (
    <>
      <PageHeader title="Créateurs" description="Qui performe le plus pour la marque">
        <Filters showOwnership={false} />
        <LastSync workspaceId={workspaceId} />
        <AddCreatorDialog />
      </PageHeader>

      <div className="grid gap-4 p-4 md:p-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Classement</CardTitle>
            <CardDescription>Vues gagnées sur {filters.days} jours, tous comptes confondus. Les comptes internes sont regroupés sous « {workspace.name} ».</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {leaderboard.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune donnée. Ajoute des comptes pour commencer.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Créateur</TableHead>
                    <TableHead className="hidden sm:table-cell">Plateformes</TableHead>
                    <TableHead className="text-right">Vues gagnées</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Likes gagnés</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Followers gagnés</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Posts</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Followers</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">Vues / post</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((c, i) => (
                    <TableRow key={c.id ?? "__owned"}>
                      <TableCell className="text-muted-foreground tabular-nums">{i + 1}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.ownership === "OWNED" ? "Comptes internes" : "Créateur"} · {c.accounts} compte{c.accounts > 1 ? "s" : ""}
                        </p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex gap-1.5 text-muted-foreground">
                          {c.platforms.map((p) => (
                            <PlatformIcon key={p} platform={p} className="size-4" />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCompact(c.viewsInPeriod)}</TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatCompact(c.likesInPeriod)}</TableCell>
                      <TableCell className={`hidden text-right tabular-nums md:table-cell ${c.followersGained > 0 ? "text-emerald-600 dark:text-emerald-400" : c.followersGained < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                        {c.followersGained > 0 ? "+" : ""}
                        {formatCompact(c.followersGained)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">{c.postsInPeriod}</TableCell>
                      <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">{formatCompact(c.followers)}</TableCell>
                      <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
                        {c.postsInPeriod ? formatCompact(Math.round(c.viewsInPeriod / c.postsInPeriod)) : "–"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Annuaire</CardTitle>
            <CardDescription>Créateurs enregistrés dans le workspace.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {creators.length === 0 && <p className="text-sm text-muted-foreground">Aucun créateur pour le moment.</p>}
            {creators.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {c.name}
                    <Badge variant="secondary" className="font-normal">
                      {c._count.accounts} compte{c._count.accounts > 1 ? "s" : ""}
                    </Badge>
                  </p>
                  {c.email && <p className="truncate text-xs text-muted-foreground">{c.email}</p>}
                  {c.notes && <p className="mt-1 text-xs text-muted-foreground">{c.notes}</p>}
                </div>
                <DeleteCreatorButton creatorId={c.id} name={c.name} accounts={c._count.accounts} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
