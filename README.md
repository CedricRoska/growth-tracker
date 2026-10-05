# Growth Tracker

Dashboard interne pour suivre, en un coup d’œil, les performances de tous les comptes TikTok et Instagram
qui font la promotion de la marque : comptes possédés en propre et comptes de créateurs partenaires.
Inspiré de viral.app. Premier usage : Loucio.

## Fonctionnalités

- **Dashboard** : vues, likes, followers et posts publiés sur 7 / 30 / 90 jours, avec comparaison à la période précédente et courbe quotidienne.
- **Comptes** : leaderboard des comptes par vues gagnées, ajout d’un compte en un clic (le profil et ses posts sont récupérés immédiatement).
- **Posts** : tous les posts de la période, triés par vues, likes, engagement ou date.
- **Créateurs** : classement par créateur (les comptes internes sont regroupés), annuaire avec notes.
- **Rafraîchissement à la demande** (comme PostHog) : un bouton « Rafraîchir » sur chaque page relance la collecte. Pas de synchro automatique, donc pas de coût API quand personne ne regarde. Chaque rafraîchissement prend un snapshot des métriques, ce qui permet de calculer les vues *gagnées* sur une période ; les courbes sont interpolées entre deux rafraîchissements.
- Filtres partout : période, plateforme, type de compte (interne / créateur), créateur.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Prisma 7 + Postgres · Auth.js v5 · Recharts · Vercel.

## Démarrer en local

```bash
npm install                 # génère aussi le client Prisma (postinstall)
cp .env.example .env        # puis renseigne AUTH_SECRET (openssl rand -base64 32)
npm run db:local            # Postgres embarqué, aucune installation requise (laisser tourner)
```

Dans un second terminal :

```bash
npm run db:migrate          # crée les tables
npm run db:seed             # données de démo : 8 comptes, 45 jours d'historique
npm run dev                 # http://localhost:3000
```

Connexion par défaut (voir `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` dans `.env`) : `admin@loucio.local` / `changeme123`.

Le `.env.example` pointe déjà sur le Postgres embarqué (`localhost:54329`). Pour utiliser une vraie base ([Neon](https://neon.tech) gratuit, ou l’intégration Postgres de Vercel), remplace `DATABASE_URL`.

## Source des données

Le choix se fait avec `SOCIAL_PROVIDER` :

| Valeur | Description |
| --- | --- |
| `mock` (défaut) | Données simulées et déterministes qui évoluent dans le temps. Aucune clé requise. |
| `scrapecreators` | Données publiques TikTok / Instagram via [ScrapeCreators](https://scrapecreators.com). Renseigner `SCRAPECREATORS_API_KEY`. Mapping validé ; `npm run provider:check` permet de le re-tester (Instagram ne fournit ni partages ni enregistrements, ces colonnes restent à 0). |

Pourquoi une API de données publiques plutôt que les APIs officielles ? Les comptes des créateurs ne nous appartiennent pas : impossible de leur demander un OAuth à chacun. Les APIs officielles (TikTok Display API, Instagram Graph API) restent envisageables plus tard pour enrichir les comptes possédés en propre.

Ajouter une autre source = implémenter l’interface `SocialProvider` dans `src/lib/providers/` (deux méthodes : `getProfile`, `getRecentPosts`).

## Déployer sur Vercel

1. Pousser le repo sur GitHub, l’importer dans Vercel.
2. Variables d’environnement : `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, `SOCIAL_PROVIDER`, `SCRAPECREATORS_API_KEY` (si utilisé). Pas besoin d’`AUTH_URL` sur Vercel.
3. Build command : `npx prisma generate && npx prisma migrate deploy && next build` (ou garder `next build` et lancer `prisma migrate deploy` à la main).
4. Optionnel : si un jour vous voulez une synchro automatique, l’endpoint `/api/cron/sync` existe toujours (protégé par `CRON_SECRET`). Il suffit de l’appeler depuis un planificateur (Vercel Cron, GitHub Actions, cron-job.org).
5. Créer le premier utilisateur : `npx prisma db seed` avec `DATABASE_URL` de prod (ou adapter le seed pour ne créer que le workspace et l’admin).

## Structure

```
prisma/schema.prisma        Workspace, User, Creator, Account, Post, PostSnapshot, AccountSnapshot, SyncRun
src/lib/providers/          Abstraction SocialProvider + implémentations mock / scrapecreators
src/lib/sync.ts             Synchronisation d'un compte / d'un workspace
src/lib/queries.ts          Agrégations du dashboard (deltas entre snapshots)
src/actions/                Server actions (comptes, créateurs, auth, sync)
src/app/(app)/              Pages protégées : dashboard, accounts, posts, creators
src/app/api/cron/sync       Endpoint appelé par Vercel Cron
```

## Pistes suivantes

- Paiement des créateurs au 1000 vues (taux par créateur, montant dû sur la période).
- Alertes (post qui décolle, compte qui ne publie plus).
- Multi-workspace / invitations pour en faire un vrai SaaS.
- APIs officielles en OAuth pour les comptes internes (métriques privées : reach, rétention).
