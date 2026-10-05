import { requireSession } from "@/auth";
import { AddAccountDialog } from "@/components/accounts/add-account-dialog";
import { AccountsTable } from "@/components/dashboard/accounts-table";
import { Filters } from "@/components/dashboard/filters";
import { PageHeader } from "@/components/layout/page-header";
import { LastSync } from "@/components/layout/last-sync";
import { Card, CardContent } from "@/components/ui/card";
import { getAccountsLeaderboard, getCreators, parseFilters, type SearchParams } from "@/lib/queries";

export const metadata = { title: "Comptes" };

export default async function AccountsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { workspaceId } = await requireSession();
  const filters = parseFilters(workspaceId, await searchParams);
  const [accounts, creators] = await Promise.all([getAccountsLeaderboard(filters), getCreators(workspaceId)]);

  return (
    <>
      <PageHeader title="Comptes" description={`${accounts.length} compte${accounts.length > 1 ? "s" : ""} suivi${accounts.length > 1 ? "s" : ""}`}>
        <Filters creators={creators} />
        <LastSync workspaceId={workspaceId} />
        <AddAccountDialog creators={creators} />
      </PageHeader>
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="px-0">
            <AccountsTable accounts={accounts} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
