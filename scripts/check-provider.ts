/**
 * Verifie que le provider configure (SOCIAL_PROVIDER) repond et que le mapping des champs est correct.
 *   npm run provider:check            -> comptes publics de test (tiktok / instagram)
 *   npm run provider:check -- loucio  -> un handle precis sur les deux plateformes
 * Cout : 2 requetes API par plateforme.
 */
import "dotenv/config";
import { getSocialProvider } from "../src/lib/providers";

async function main() {
  const handleArg = process.argv[2];
  const provider = getSocialProvider();
  console.log("Provider :", provider.name);
  const targets = handleArg
    ? ([["TIKTOK", handleArg], ["INSTAGRAM", handleArg]] as const)
    : ([["TIKTOK", "tiktok"], ["INSTAGRAM", "instagram"]] as const);

  for (const [platform, handle] of targets) {
    console.log(`\n=== ${platform} @${handle}`);
    try {
      const profile = await provider.getProfile(platform, handle);
      console.log("profil   :", { displayName: profile.displayName, followers: profile.followers, avatar: profile.avatarUrl ? "ok" : "MANQUANT", bio: profile.bio?.slice(0, 40) ?? null });
      const posts = await provider.getRecentPosts(platform, handle, { limit: 5 });
      console.log("posts    :", posts.length);
      for (const p of posts.slice(0, 3)) {
        console.log("  -", { id: p.externalId, date: p.publishedAt.toISOString().slice(0, 10), vues: p.views, likes: p.likes, comm: p.comments, partages: p.shares, saves: p.saves, thumb: p.thumbnailUrl ? "ok" : "MANQUANT", caption: p.caption?.slice(0, 30) ?? null });
      }
      const suspicious = posts.filter((p) => p.views === 0 && p.likes === 0);
      if (posts.length === 0) console.log("  !! aucun post : verifier le chemin d'API / le nom de la liste");
      else if (suspicious.length === posts.length) console.log("  !! toutes les metriques sont a 0 : mapping des champs a corriger");
    } catch (e) {
      console.log("ERREUR :", e instanceof Error ? e.message.slice(0, 500) : e);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
