import { seedTitles } from "./seed";
import { TABS, type TabKey } from "./tabs";
import type { Kind } from "./types";

export function validateTab(s: Record<string, unknown>): { tab?: TabKey } {
  const tab = TABS.find((t) => t.key === s.tab)?.key;
  return tab && tab !== "lessons" ? { tab } : {};
}

/** SEO head for title pages, built from the server-known catalog. Never includes spoiler content. */
export function titleHead(kind: Kind, slug: string) {
  const t = seedTitles.find((x) => x.slug === slug && x.kind === kind);
  const name = t ? `${t.name} (${t.year})` : kind === "movie" ? "Movie" : "Series";
  const desc = t ? `Lessons, quotes, moments, reviews and questions about ${t.name}. ${t.synopsis}` : "Community conversation on Inktella.";
  return {
    meta: [
      { title: `${name} — Inktella` },
      { name: "description", content: desc.slice(0, 160) },
      { property: "og:title", content: `${name} — Inktella` },
      { property: "og:description", content: desc.slice(0, 160) },
      { property: "og:type", content: kind === "movie" ? "video.movie" : "video.tv_show" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `/${kind}/${slug}` }],
  };
}
