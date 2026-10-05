-- Crédits restants chez le fournisseur de données (renvoyés par l'API à chaque appel)
ALTER TABLE "Workspace" ADD COLUMN "providerCredits" INTEGER;
ALTER TABLE "Workspace" ADD COLUMN "providerCreditsAt" TIMESTAMP(3);
