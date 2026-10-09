import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Client Prisma partagé.
 *
 * Serverless (Vercel) + Supabase : chaque instance de fonction a son propre pool, et le pooler
 * Supabase plafonne le nombre de clients (15 en mode session). On garde donc un pool très
 * petit, on libère vite les connexions inactives, et on recommande en production l'URL du
 * pooler en mode « transaction » (port 6543), qui multiplexe les clients. Les migrations
 * passent par DIRECT_URL (voir prisma.config.ts).
 */
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL manquante. Copie .env.example vers .env et renseigne-la.");
  }
  const adapter = new PrismaPg({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
