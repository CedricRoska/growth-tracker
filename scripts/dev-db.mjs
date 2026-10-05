/**
 * Postgres local embarqué pour développer sans rien installer (ni Postgres, ni Docker).
 *
 *   npm run db:local
 *
 * Les données vivent dans .local/pg (ignoré par git). La première exécution initialise
 * le cluster et crée la base `growth`. URL à mettre dans .env :
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:54329/growth"
 */
import { existsSync } from "node:fs";
import EmbeddedPostgres from "embedded-postgres";

const PORT = Number(process.env.LOCAL_PG_PORT ?? 54329);
const DIR = ".local/pg";
const fresh = !existsSync(`${DIR}/PG_VERSION`);

const pg = new EmbeddedPostgres({
  databaseDir: DIR,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

if (fresh) {
  console.log("Initialisation du cluster Postgres…");
  await pg.initialise();
}
await pg.start();
if (fresh) await pg.createDatabase("growth");

console.log(`✔ Postgres prêt : postgresql://postgres:postgres@localhost:${PORT}/growth`);
console.log("  (Ctrl+C pour arrêter)");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
