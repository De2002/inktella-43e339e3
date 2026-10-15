import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useDB } from "@/lib/store";
import { PageHeader, Poster, TitleLink } from "@/components/bits";
import { CollectionCard } from "@/components/CollectionCard";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore movies & series — Inktella" },
      { name: "description", content: "Browse movies, series and member collections on Inktella." },
      { property: "og:title", content: "Explore movies & series — Inktella" },
      { property: "og:description", content: "Browse movies, series and member collections on Inktella." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Explore,
});

function Explore() {
  const db = useDB();
  const [kind, setKind] = useState<"all" | "movie" | "series">("all");
  const [genre, setGenre] = useState<string | null>(null);
  const titles = db.titles.filter((t) => t.status === "published");
  const genres = Array.from(new Set(titles.flatMap((t) => t.genres))).sort();
  const shown = titles.filter((t) => (kind === "all" || t.kind === kind) && (!genre || t.genres.includes(genre))).sort((a, b) => a.name.localeCompare(b.name));
  const chip = (on: boolean) => cn("whitespace-nowrap rounded-full border px-3 py-1 text-sm transition-colors", on ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground");

  return (
    <div>
      <PageHeader title="Explore" sub="Every title is a place to talk." />
      <div className="flex gap-2">
        {(["all", "movie", "series"] as const).map((k) => (
          <button key={k} className={chip(kind === k)} onClick={() => setKind(k)}>{k === "all" ? "All" : k === "movie" ? "Movies" : "Series"}</button>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        <button className={chip(genre === null)} onClick={() => setGenre(null)}>Any genre</button>
        {genres.map((g) => <button key={g} className={chip(genre === g)} onClick={() => setGenre(g)}>{g}</button>)}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
        {shown.map((t) => (
          <TitleLink key={t.id} title={t} className="group">
            <Poster title={t} size="sm" className="transition-opacity group-hover:opacity-90" />
            <p className="mt-1.5 truncate text-sm">{t.name}</p>
            <p className="text-xs text-muted-foreground">{t.year} · {t.kind === "movie" ? "Movie" : "Series"}</p>
          </TitleLink>
        ))}
      </div>
      <h2 className="mt-14 text-3xl">From the community</h2>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {db.collections.filter((c) => c.titleIds.length).slice(0, 6).map((c) => <CollectionCard key={c.id} collection={c} />)}
      </div>
    </div>
  );
}
