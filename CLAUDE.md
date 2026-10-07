# Growth Tracker

SaaS interne (clone de viral.app) : centralise les performances des comptes TikTok / Instagram
qui font la promotion de la marque (comptes possédés en propre + comptes de créateurs tiers).
Premier client : Loucio (le fondateur et son associé). Langue de l'UI : français.

## Stack
- Next.js 16 (App Router, `src/`), React 19, TypeScript, Tailwind v4, shadcn/ui (style base-nova, Base UI).
- Prisma 7 + Postgres via `@prisma/adapter-pg`. Client généré dans `src/generated/prisma` (ignoré par git) → `npx prisma generate` après clone.
- Auth.js v5 (credentials email + mot de passe, JWT). `src/proxy.ts` protège toutes les routes sauf `/login`, `/api/auth`, `/api/cron`.
- Déploiement Vercel. Données rafraîchies **à la demande uniquement** (bouton « Rafraîchir » = 7 j, menu « Rafraîchir complet » = 30 j ; composants `SyncButton` / `LastSync` sur chaque page), choix produit façon PostHog : pas de cron. L’endpoint `/api/cron/sync` (protégé par `CRON_SECRET`) reste disponible si on veut un jour planifier.

## Architecture
- `src/lib/providers/` : abstraction `SocialProvider` (`getProfile`, `getRecentPosts`). `mock` (défaut, données déterministes qui évoluent dans le temps) et `scrapecreators` (API de données publiques, mapping à valider). Choix via `SOCIAL_PROVIDER`. ScrapeCreators : 1 crédit par appel, posts paginés (10 TikTok / 12 Instagram par page). Deux modes (`SyncMode`) : `quick` remonte `SYNC_QUICK_DAYS` (7) jours, `deep` remonte `SYNC_DEEP_DAYS` (30) jours ; `SYNC_MAX_PAGES` (10) borne le coût. Ajout d un compte = deep. TikTok renvoie le profil avec les posts ; Instagram non (profil redemandé au plus 1x/24h). Les crédits restants sont stockés sur `Workspace.providerCredits` et affichés dans `LastSync`.
- `src/lib/images.ts` : les URL d images TikTok / Instagram sont signées et expirent (~24 h), TikTok sert du HEIC. À chaque synchro on télécharge avatars et vignettes, on les réduit en WebP (sharp) et on stocke une data URL en base (`avatarUrl` / `thumbnailUrl`, source sans signature dans `avatarSource` / `thumbnailSource` pour ne pas re-télécharger). HEIC non décodable → repli sur l endpoint profil (JPEG).
- `src/lib/sync.ts` : synchronise un compte → upsert des posts + `PostSnapshot` + `AccountSnapshot`. Les métriques « sur la période » sont des deltas entre snapshots, interpolés linéairement entre deux rafraîchissements (`stateAt`).
- `src/lib/periods.ts` : constantes/types partagés client-serveur (ne jamais importer `queries.ts` ou `prisma.ts` depuis un composant client : ça embarque `pg` dans le bundle navigateur).
- `src/lib/queries.ts` : agrégations du dashboard (overview, séries journalières, leaderboards comptes / créateurs, top posts). Filtres via searchParams (`days`, `platform`, `ownership`, `creator`).
- `src/actions/` : server actions (comptes, créateurs, auth, sync).
- Pages dans `src/app/(app)/` : dashboard, accounts, accounts/[id], posts, creators.

## Commandes
- `npm run db:local` (Postgres embarqué, port 54329, données dans `.local/pg`) · `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck`
- `npm run provider:check [handle]` : teste le provider configuré sur un vrai compte (mapping validé sur ScrapeCreators le 2026-10-05 ; Instagram ne fournit ni partages ni saves).
- `npm run db:migrate` (local) · `npm run db:deploy` (prod) · `npm run db:seed` (démo : 8 comptes, 45 jours d'historique)

## Conventions
- Tout accès données passe par `requireSession()` et filtre par `workspaceId` (multi-tenant dès le départ).
- Composants serveur par défaut ; `"use client"` seulement pour interactions (filtres, dialogs, charts).
- Pas de secrets dans le code : tout dans `.env` (voir `.env.example`).
