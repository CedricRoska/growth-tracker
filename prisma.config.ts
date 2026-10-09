import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations : connexion directe ou pooler en mode session (DIRECT_URL), jamais le mode transaction.
    // `prisma generate` (postinstall) ne se connecte pas : un placeholder suffit si la variable manque.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/placeholder",
  },
});
