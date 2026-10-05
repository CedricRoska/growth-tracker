import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DbError } from "@/components/layout/db-error";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getWorkspace } from "@/lib/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const workspaceId = session?.user?.workspaceId;
  if (!session?.user || !workspaceId) redirect("/login");

  let workspace: Awaited<ReturnType<typeof getWorkspace>>;
  try {
    workspace = await getWorkspace(workspaceId);
  } catch (err) {
    // Base injoignable (Postgres local non lancé, mauvaise URL…) : écran explicite plutôt qu'une stack Prisma.
    return <DbError message={err instanceof Error ? err.message : String(err)} />;
  }
  // Session valide mais workspace disparu (base réinitialisée) : on force une reconnexion.
  if (!workspace) redirect("/api/auth/signout?callbackUrl=/login");

  return (
    <SidebarProvider>
      <AppSidebar workspaceName={workspace.name} userEmail={session.user.email ?? ""} />
      <SidebarInset className="min-w-0">{children}</SidebarInset>
    </SidebarProvider>
  );
}
