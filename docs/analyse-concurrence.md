# Analyse concurrentielle : viral.app, Whop Content Rewards, ClipAffiliates / Vyro

*Rédigée le 7 octobre 2026. À relire avant d'attaquer la prochaine grosse itération de Growth Tracker.*

## En une phrase

Les quatre produits font du suivi de vues comme nous, mais leur valeur vient de ce qu'ils construisent **autour** : la rémunération des créateurs au résultat, la vérification des vues, les alertes et le lien avec le business.

## Ce que fait chacun

### viral.app
« Le système d'exploitation du marketing UGC ». Trois blocs :
- **Analytics** : suivi de n'importe quel compte public sur TikTok, Instagram Reels, YouTube Shorts, Facebook Reels et Snapchat Spotlight. Données rafraîchies toutes les 12 à 24 h selon le plan (horaire en Enterprise). Vues par pays, revenus d'app via RevenueCat, classification des vidéos par IA avec tags, suivi des concurrents, bibliothèque de vidéos virales.
- **Campagnes et créateurs** : campagnes illimitées, roster de créateurs, marketplace Canvas UGC pour recruter, vérification des publications, onboarding.
- **Paiements** : fixe par vidéo + paliers de CPM + bonus avec plafonds. Versement dans 180 pays (virement, PayPal, Venmo, USDC, EURC), facturation au nom du créateur, KYC et DAC7. 3 % de frais.
- **Collaboration et intégrations** : rôles et permissions, dashboards publics partageables, alertes Slack / Discord sur jalons et retards, export CSV, API, webhooks, n8n.
- **Prix** : Pro 99 $ (10 créateurs, 1 000 vidéos), Ultra 299 $ (50 créateurs, 5 000 vidéos, API), Scale 499 $ (500 créateurs, 20 000 vidéos), Enterprise sur devis. Service complet à partir de 20 k$ par mois.

### Whop Content Rewards
Marketplace de clipping. La marque crée une campagne (clipping ou UGC) avec budget, taux par 1 000 vues, paiement minimum, plafond par vidéo, bonus forfaitaire optionnel, plateformes acceptées, règles (hashtags obligatoires, source autorisée, formats interdits). Les clippers postent, soumettent leurs liens, Whop vérifie les vues sur une fenêtre de plusieurs jours, la marque approuve ou rejette, le paiement part automatiquement. Anti-fraude : comptes liés vérifiés, détection de doublons, litiges de vues, reprise des gains. L'unité est la **soumission**, pas le compte : pas d'analytics de compte à proprement parler.

### ClipAffiliates et Vyro
Même famille. ClipAffiliates met en avant un dashboard marque (campagnes, CPM, budget, assets, gestion des clippers), des vues « vérifiées par API » et des CPM de 1 à 5 $. Vyro (lancé par MrBeast) est orienté clippers : paiement à l'heure contre les vues mesurées par ViewStats, plafond de 1 000 $ par clip, pas de dashboard marque complet. Les deux rejettent ou reprennent les gains en cas de trafic artificiel.

## Tableau comparatif

| Capacité | viral.app | Whop | ClipAffiliates / Vyro | Growth Tracker |
| --- | --- | --- | --- | --- |
| Suivi de comptes publics sans OAuth | Oui, 5 plateformes | Non (liens soumis) | Non (liens soumis) | Oui, TikTok + Instagram |
| Fréquence des données | 12 à 24 h, horaire en Enterprise | Fenêtre de vérification | Horaire (Vyro) | À la demande |
| Rémunération au résultat (CPM, paliers, plafonds) | Oui | Oui | Oui | Non |
| Versement des paiements | Oui, 180 pays | Oui | Oui | Non |
| Vérification des vues / anti-fraude | Partiel | Oui | Oui | Non |
| Soumission et approbation des posts | Oui | Oui | Oui | Non |
| Alertes (jalons, créateur silencieux) | Slack, Discord | Non | Non | Non |
| API, webhooks, export CSV | Oui | Partiel | Partiel | Non |
| Suivi des concurrents | Oui | Non | Non | Non |
| Bibliothèque virale, analyse des hooks | Oui | Non | Non | Non |
| YouTube Shorts | Oui | Oui | Oui | Non |
| Rôles, sièges, dashboards partageables | Oui | Oui | Partiel | Non |
| Recrutement de créateurs | Marketplace | Marketplace | Marketplace | Non |
| Images mises en cache, graphiques par jour de publication | Oui | — | — | Oui |
| Coût pour 10 créateurs | 99 $ / mois | % du budget | % du budget | Quelques $ de crédits API |

## Ce qu'ils font et que nous ne faisons pas

1. **Payer les créateurs selon les vues.** Taux par 1 000 vues, fixe par vidéo, paliers, plafonds, calcul automatique du dû sur la période. Nous avons toutes les données, il manque la couche « règles de rémunération » et le récapitulatif par créateur.
2. **Vérification et anti-fraude.** Vues achetées, doublons, comptes qui n'appartiennent pas au créateur, fenêtre de maturation avant paiement. Nous prenons les chiffres tels quels.
3. **Soumission et approbation.** Un post n'est compté que s'il respecte les règles. Nous suivons tout ce qu'un compte publie sans distinguer ce qui est « pour la marque ». Un filtre par hashtag ou mention donnerait l'essentiel.
4. **Alertes et intégrations.** Slack / Discord sur paliers de vues et créateurs silencieux, API, webhooks, CSV.
5. **Concurrents et bibliothèque virale.** Comptes marqués « concurrent » pour comparer, vidéos virales classées par IA avec analyse des hooks.
6. **YouTube Shorts.**
7. **Collaboration.** Rôles, sièges, pages publiques partageables (par exemple pour montrer ses résultats à un créateur).
8. **Recrutement.** Marketplace, candidatures, chat. Hors sujet pour un outil interne.

## Ce que nous faisons mieux ou différemment

- **Coût** : quelques dollars de crédits API et un hébergement gratuit, contre 99 $ par mois minimum.
- **Rafraîchissement à la demande** : plus réactif qu'un cycle de 12 à 24 h quand on veut vérifier un post, sans coût quand personne ne regarde.
- **Analytique de base au niveau** : images en cache, graphiques par jour de publication, leaderboard par créateur, filtres interne / créateur.

## Ordre de priorité suggéré pour Loucio

1. Rémunération des créateurs : taux par créateur, montant dû sur la période, export.
2. Filtre « contenu pour la marque » par hashtag ou mention.
3. Alertes : post qui dépasse un palier, créateur silencieux depuis N jours.
4. Comptes concurrents : même tracking, badge différent, comparaison.
5. YouTube Shorts si les créateurs y publient.

L'anti-fraude et le versement des paiements ne valent le coup que si Growth Tracker devient un SaaS ouvert à d'autres marques.

## Sources

- https://viral.app
- https://viral.app/comparisons/clip
- https://viral.app/comparisons/collabstr
- https://docs.whop.com/memberships-and-access/third-party-apps/content-rewards.md
- https://openclip.app/guides/whop-clipping-guide
- https://openclip.app/compare/whop-vs-vyro
- https://www.clipaffiliates.com/blog/clipaffiliates-vs-vyro (site inaccessible aux robots, informations reprises des résultats de recherche)
- https://trends.vc/clipping-businesses-pay-per-view-distribution-clip-armies-view-verification/
