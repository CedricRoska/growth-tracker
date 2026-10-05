import { MockProvider } from "./mock";
import { ScrapeCreatorsProvider } from "./scrapecreators";
import type { SocialProvider } from "./types";

export * from "./types";

let cached: SocialProvider | null = null;

/** Sélectionne le provider selon SOCIAL_PROVIDER (mock par défaut). */
export function getSocialProvider(): SocialProvider {
  if (cached) return cached;
  const kind = (process.env.SOCIAL_PROVIDER ?? "mock").toLowerCase();
  switch (kind) {
    case "scrapecreators":
      cached = new ScrapeCreatorsProvider(process.env.SCRAPECREATORS_API_KEY ?? "");
      break;
    case "mock":
    default:
      cached = new MockProvider();
  }
  return cached;
}
