import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le driver Postgres et le client Prisma restent côté Node, jamais bundlés pour le navigateur.
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@prisma/client", "sharp"],
};

export default nextConfig;
