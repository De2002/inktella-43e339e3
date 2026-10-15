import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useDB } from "@/lib/store";
import { searchCollections, searchTitles } from "@/lib/search";
import { Poster, TitleLink } from "@/components/bits";
import { SearchBox } from "@/components/SearchBox";
import { CollectionCard } from "@/components/CollectionCard";

type SType = "all" | "movie" | "series" | "collections";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): { q: string; type: SType } => ({
    q: typeof s.q === "string" ? s.q.slice(0, 100) : "",
    type: (["all", "movie", "series", "collections"] as const).includes(s.type as SType) ? (s.type as SType) : "all",
  }),
  head: () => ({
    meta: [
      { title: "Search — Inktella" },
      { name: "description", content: "Find movies, series and collections on Inktella by title, year, cast, director or genre." },
      { property: "og:title", content: "Search — Inktella" },
      { property: "og:description", content: "Find movies, series and collections on Inktella." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q, type } = Route.useSearch();
  const db = useDB();
  const navigate = useNavigate({ from: "/search" });
  const titles = useMemo(() => (q.length >= 2 ? searchTitles(db.titles, q, 40) : []), [db.titles, q]);
  const cols = useMemo(() => (q.length >= 2 ? searchCollections(db.collections, q) : []), [db.collections, q]);
  const shownTitles = type === "collections" ? [] : titles.filter((t) => type === "all" || t.kind === type);
  const shownCols = type === "all" || type === "collections" ? cols : [];

  return (
    <div className="mx-auto max-w-2xl pt-6">
      <SearchBox key={q} initial={q} autoFocus={!q} onSubmit={(nq) => navigate({ search: { q: nq, type } })} />
      <div className="mt-4 flex gap-2">
        {(["all", "movie", "series", "collections"] as const).map((k) => (
          <button
            key={k}
            onClick={() => navigate({ search: { q, type: k }, replace: true })}
            className={cn("rounded-full border px-3 py-1 text-sm", type === k ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
          >
            {k === "all" ? "All" : k === "movie" ? "Movies" : k === "series" ? "Series" : "Collections"}
          </button>
        ))}
      </div>
      {q.length < 2 ? (
        <p className="mt-12 text-center text-muted-foreground">Type at least two letters. Try a title, a year, an actor or a genre.</p>
      ) : shownTitles.length + shownCols.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="font-display text-2xl">Nothing found for “{q}”</p>
          <p className="mt-2 text-sm text-muted-foreground">Check the spelling, try fewer words, or search by cast or director.</p>
        </div>
      ) : (
        <>
          <ul className="mt-6 divide-y">
            {shownTitles.map((t) => (
              <li key={t.id}>
                <TitleLink title={t} className="flex items-center gap-4 py-3 hover:opacity-80">
                  <Poster title={t} size="xs" className="w-12 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-display text-xl leading-tight">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.year} · {t.kind === "movie" ? "Movie" : "Series"} · {t.genres.slice(0, 2).join(", ")}</p>
                    <p className="truncate text-xs text-subtle">{t.people.slice(0, 3).map((p) => p.name).join(", ")}</p>
                  </div>
                </TitleLink>
              </li>
            ))}
          </ul>
          {shownCols.length > 0 && (
            <>
              <h2 className="mt-10 text-2xl">Collections</h2>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">{shownCols.map((c) => <CollectionCard key={c.id} collection={c} />)}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}
