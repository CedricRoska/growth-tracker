import { DatabaseZap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DbError({ message }: { message: string }) {
  const isLocal = (process.env.DATABASE_URL ?? "").includes("localhost:54329");
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <DatabaseZap className="size-5" />
          </div>
          <CardTitle>Base de données injoignable</CardTitle>
          <CardDescription>L’application n’arrive pas à se connecter à Postgres.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          {isLocal ? (
            <>
              <p>Tu utilises le Postgres embarqué : lance-le dans un second terminal, puis recharge la page.</p>
              <pre className="rounded-md bg-muted px-3 py-2 font-mono text-xs">npm run db:local</pre>
              <p className="text-muted-foreground">Première fois ? Enchaîne avec <code className="font-mono">npm run db:migrate</code> puis <code className="font-mono">npm run db:seed</code>.</p>
            </>
          ) : (
            <p>
              Vérifie <code className="font-mono">DATABASE_URL</code> dans ton <code className="font-mono">.env</code> et que la base accepte les connexions.
            </p>
          )}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Détail de l’erreur</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-2 font-mono">{message}</pre>
          </details>
        </CardContent>
      </Card>
    </main>
  );
}
