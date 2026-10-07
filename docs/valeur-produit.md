# Au-delà du tracking : quelle valeur Growth Tracker peut apporter

*Réflexion du 7 octobre 2026. Point de départ : un dashboard qui compte les vues ne dit pas quoi faire. Quelles décisions l'outil doit-il aider à prendre, chaque semaine, pour que la promo de Loucio sur TikTok et Instagram progresse ?*

## Les cinq questions qu'un utilisateur se pose

Chaque bloc ci-dessous part d'une question réelle, puis liste ce que l'outil pourrait répondre. Les niveaux de tracking (« où en est-on ? ») sont déjà couverts ; tout le reste est à construire.

### 1. Où en est-on ? (fait)
Vues, likes, followers, posts par période, par compte, par créateur, par plateforme. Rafraîchissement à la demande.

### 2. Pourquoi ça a marché, ou pas ? (comprendre)

Transformer des chiffres en enseignements réutilisables.

- **Autopsie des posts qui décollent** : qu'ont en commun les 10 % de posts les plus vus par rapport aux autres ? Hook des trois premières secondes, format (face caméra, texte à l'écran, voix off, duo), durée, sujet, hashtags, heure et jour de publication, musique. Première version sans IA : légende, longueur, heure, hashtags. Deuxième version : classification par IA à partir de la légende et de la miniature.
- **Taux d'engagement et de « vélocité »** : vues par heure dans les premières 24 h. Un post qui démarre vite mérite une action immédiate (voir bloc 3). Nos snapshots permettent déjà de le calculer si on rafraîchit un post plusieurs fois le premier jour.
- **Benchmark par créateur** : vues médianes par post, régularité, meilleur format pour chaque personne. Dire à Clara « tes vidéos face caméra font trois fois plus que tes montages » est plus utile qu'un total de vues.
- **Effet plateforme** : le même contenu publié sur TikTok et Reels, qui gagne ? Vaut-il la peine de reposter systématiquement ?
- **Santé des comptes** : chute brutale de la portée sur plusieurs posts d'affilée (shadowban probable), ratio vues / followers anormal, engagement qui s'effondre.

### 3. Que fait-on cette semaine ? (décider et agir)

Le dashboard devrait ouvrir sur une liste d'actions, pas sur un graphique.

- **Post qui décolle en ce moment** : reposter sur les comptes internes, le mettre en avant, le sponsoriser (Spark Ads / boost Instagram), demander à deux autres créateurs de refaire le format. Alerte par email ou Slack quand un post passe un palier (50 k, 100 k, 500 k) dans ses premières 48 h.
- **Créateur silencieux** : aucun post depuis N jours alors que le deal prévoit deux par semaine. Alerte et relance en un clic (message pré-rédigé).
- **Format à reproduire** : « les posts avec un hook en question ont fait +80 % cette semaine, voici un brief à envoyer aux créateurs ». La bibliothèque de posts performants devient un vivier de briefs.
- **Trous de cross-posting** : posts TikTok jamais repostés en Reels, ou l'inverse.
- **Résumé du lundi matin** : email automatique avec les chiffres de la semaine, le meilleur post, le créateur de la semaine, les trois actions suggérées. C'est le format qui rend l'outil utilisé sans qu'on ait à l'ouvrir.

### 4. Combien ça rapporte, et à qui ? (piloter les créateurs et l'argent)

- **Rémunération** : taux par créateur (fixe par post, par 1 000 vues, paliers, plafond), montant dû sur la période, historique, export pour la compta. Aujourd'hui calculé à la main, source d'erreurs et de discussions.
- **Coût pour 1 000 vues réel par créateur** : ce que coûte chaque créateur rapporté à ce qu'il génère. Permet d'arbitrer le budget entre créateurs et de négocier.
- **Cadence contractuelle** : objectif de posts par semaine par créateur, taux de respect, retards.
- **Contenu « pour la marque » vs reste** : sur un compte de créateur, ne compter que les posts qui mentionnent Loucio, un hashtag ou un code promo. Indispensable pour la rémunération.
- **Page créateur partageable** : un lien en lecture seule pour que chaque créateur voie ses propres chiffres et ce qui lui sera versé. Transparence, moins de messages.

### 5. Est-ce que ça sert vraiment Loucio ? (relier aux résultats business)

C'est la valeur ultime : des vues ne sont qu'un proxy. Ce qui compte, ce sont les visites, inscriptions, téléchargements ou ventes.

- **Lien en bio et UTM par créateur** : chaque créateur a son lien tracé ; on mesure clics, inscriptions, ventes par créateur et par post. Branchement sur PostHog, Google Analytics ou Stripe. viral.app fait l'équivalent avec RevenueCat pour les apps.
- **Code promo par créateur** : même logique côté ventes.
- **Courbes superposées** : vues du jour vs inscriptions du jour. On voit immédiatement quel pic de vues a converti et lequel n'a rien donné.
- **Coût d'acquisition par créateur** : rémunération versée / clients amenés. La seule métrique qui permet de décider où mettre l'argent.
- **Objectifs** : objectif mensuel de vues, de followers ou d'inscriptions, avec progression et projection. Donne un cap à l'équipe et aux créateurs.

## Ce que ça change dans le produit

Aujourd'hui l'écran d'accueil est un dashboard de chiffres. La cible est un écran qui dit : **voilà ce qui se passe, voilà pourquoi, voilà quoi faire**. Concrètement :

1. **Accueil « Cette semaine »** : trois chiffres clés, trois posts qui décollent, créateurs silencieux, actions suggérées.
2. **Onglet Insights** : patterns des posts performants, meilleur format par créateur, meilleurs créneaux de publication.
3. **Onglet Créateurs enrichi** : cadence, rémunération due, coût pour 1 000 vues, lien partageable.
4. **Onglet Business** : vues vs conversions, coût d'acquisition par créateur, objectifs.
5. **Alertes** : email ou Slack, configurables par palier et par silence.

## Par où commencer

Par ordre de valeur ramenée à l'effort :

| Priorité | Fonction | Pourquoi | Effort |
| --- | --- | --- | --- |
| 1 | Filtre « contenu pour la marque » (hashtag / mention) | Préalable à tout calcul par créateur | Faible |
| 2 | Rémunération des créateurs (taux, dû, export) | Supprime un travail manuel, base des arbitrages | Moyen |
| 3 | Résumé hebdo par email + alertes paliers / silence | Rend l'outil utile sans l'ouvrir | Moyen |
| 4 | Autopsie des posts performants (sans IA d'abord) | Dit quoi produire | Moyen |
| 5 | UTM / code promo par créateur, courbe vues vs inscriptions | Relie au business, décide le budget | Moyen à élevé |
| 6 | Page créateur partageable | Transparence, moins d'allers-retours | Faible à moyen |
| 7 | Classification IA des contenus, bibliothèque de briefs | Industrialise l'étape 4 | Élevé |

## Questions à trancher avant de coder

- Comment Loucio rémunère les créateurs aujourd'hui (fixe, au post, aux vues, mélange) ? Ça détermine le modèle de rémunération à implémenter.
- Quel est le résultat business qu'on veut relier aux vues : inscriptions, téléchargements, ventes ? Où vit la donnée (PostHog, Stripe, store) ?
- Quels créateurs publient aussi du contenu sans rapport avec Loucio ? Si tous, le filtre « pour la marque » est la priorité absolue.
- Quelle fréquence de rafraîchissement acceptez-vous de payer pour détecter les posts qui décollent dans les 24 premières heures ?
