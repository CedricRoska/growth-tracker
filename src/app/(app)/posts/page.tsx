import { requireSession } from "@/auth";
import { Filters } from "@/components/dashboard/filters";
import { PostsTable } from "@/components/dashboard/posts-table";
import { SortSelect } from "@/components/dashboard/sort-select";
import { LastSync } from "@/components/layout/last-sync";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getCreators, getTopPosts, parseFilters, type PostSort, type SearchParams } from "@/lib/queries";

export const metadata = { title: "Posts" };

const SORTS: PostSort[] = ["views", "likes", "engagement", "recent"];

export default async function PostsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { workspaceId } = await requireSession();
  const sp = await searchParams;
  const filters = parseFilters(workspaceId, sp);
  const sortRaw = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort = SORTS.includes(sortRaw as PostSort) ? (sortRaw as PostSort) : "views";
  const [posts, creators] = await Promise.all([getTopPosts(filters, { limit: 100, sort }), getCreators(workspaceId)]);

  return (
    <>
      <PageHeader title="Posts" description={`Publiés sur les ${filters.days} derniers jours`}>
        <Filters creators={creators} />
        <SortSelect />
        <LastSync workspaceId={workspaceId} />
      </PageHeader>
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="px-0">
            <PostsTable posts={posts} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
