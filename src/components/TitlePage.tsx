import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { titlePath, useDB } from "@/lib/store";
import { TABS, type TabKey } from "@/lib/tabs";
import type { Kind, Post, Question, Review } from "@/lib/types";
import { Empty, LoadMore, Poster, useCursor } from "./bits";
import { Composer } from "./Composer";
import { PostItem, QuestionCard, ReviewCard } from "./FeedItems";
import { TitleActions } from "./TitleActions";

export function TitlePage({ kind, slug, tab }: { kind: Kind; slug: string; tab: TabKey }) {
  const db = useDB();
  const navigate = useNavigate();
  const title = db.titles.find((t) => t.slug === slug && t.kind === kind);
  const redirectTo = !title ? db.slugRedirects[slug] : undefined;

  useEffect(() => {
    if (redirectTo) {
      const t = db.titles.find((x) => x.slug === redirectTo);
      if (t) navigate({ to: titlePath(t), params: { slug: t.slug }, search: { tab }, replace: true });
    }
  }, [redirectTo]);

  const cfg = TABS.find((t) => t.key === tab) ?? TABS[0];

  type Item = { kind: "review"; r: Review } | { kind: "question"; q: Question } | { kind: "post"; p: Post };
  const items = useMemo((): Item[] => {
    if (!title) return [];
    const by = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);
    if (cfg.key === "reviews") return db.reviews.filter((r) => r.titleId === title.id && !r.removed).sort(by).map((r) => ({ kind: "review" as const, r }));
    if (cfg.key === "questions") return db.questions.filter((q) => q.titleId === title.id && !q.removed).sort(by).map((q) => ({ kind: "question" as const, q }));
    return db.posts.filter((p) => p.titleId === title.id && p.category === cfg.category && !p.removed).sort(by).map((p) => ({ kind: "post" as const, p }));
  }, [db, title?.id, cfg.key]);

  const { visible, hasMore, more } = useCursor(items, 10);

  if (!title || title.status !== "published") {
    return <Empty>{redirectTo ? "Taking you there…" : "This title isn't available."}</Empty>;
  }

  const directors = title.people.filter((p) => p.role === "director" || p.role === "creator");
  const cast = title.people.filter((p) => p.role === "cast");
  const word = kind === "movie" ? "Movie" : "Series";

  return (
    <div className="mx-auto max-w-2xl">
      <section className="flex gap-5 pt-6 md:gap-8 md:pt-10">
        <Poster title={title} size="md" className="w-28 shrink-0 md:w-40" />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{word} · {title.year}</p>
          <h1 className="mt-1 text-4xl leading-[1.02] md:text-5xl">{title.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{title.genres.join(" · ")}</p>
          {directors.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {kind === "movie" ? "Directed by" : "Created by"} {Array.from(new Set(directors.map((d) => d.name))).join(", ")}
            </p>
          )}
        </div>
      </section>
      <p className="mt-5 leading-relaxed">{title.synopsis}</p>
      <div className="mt-4"><TitleActions title={title} /></div>

      <Collapsible className="mt-4 border-y">
        <CollapsibleTrigger className="group flex w-full items-center justify-between py-3 text-sm text-muted-foreground hover:text-foreground">
          About this {kind === "movie" ? "movie" : "series"}
          <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pb-4 text-sm">
          <dl className="grid grid-cols-[7rem_1fr] gap-y-2">
            {cast.length > 0 && (<><dt className="text-muted-foreground">Cast</dt><dd>{cast.map((c) => c.character ? `${c.name} (${c.character})` : c.name).join(", ")}</dd></>)}
            {title.runtime && (<><dt className="text-muted-foreground">Runtime</dt><dd>{title.runtime}</dd></>)}
            {title.country && (<><dt className="text-muted-foreground">Country</dt><dd>{title.country}</dd></>)}
            {title.language && (<><dt className="text-muted-foreground">Language</dt><dd>{title.language}</dd></>)}
            {title.altNames.length > 0 && (<><dt className="text-muted-foreground">Also known as</dt><dd>{title.altNames.join(", ")}</dd></>)}
          </dl>
        </CollapsibleContent>
      </Collapsible>

      <nav aria-label="Community" className="no-scrollbar sticky top-14 z-30 -mx-4 mt-2 flex gap-1 overflow-x-auto border-b bg-background/90 px-4 backdrop-blur">
        {TABS.map((t) => (
          <Link
            key={t.key}
            to={titlePath(title)}
            params={{ slug: title.slug }}
            search={{ tab: t.key }}
            replace
            resetScroll={false}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors",
              t.key === cfg.key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {cfg.key === "trailer" && (
        title.trailerUrl ? (
          <div className="mt-4 aspect-video overflow-hidden rounded-lg bg-muted">
            <iframe src={title.trailerUrl} title={`${title.name} trailer`} className="h-full w-full" loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No official trailer has been added yet.</p>
        )
      )}

      <Composer title={title} tab={cfg} />

      <div>
        {visible.length === 0 && <Empty>{cfg.empty(kind)}</Empty>}
        {visible.map((it) =>
          it.kind === "review" ? <ReviewCard key={it.r.id} review={it.r} /> :
          it.kind === "question" ? <QuestionCard key={it.q.id} question={it.q} /> :
          <PostItem key={it.p.id} post={it.p} />,
        )}
        <LoadMore show={hasMore} onClick={more} />
      </div>
    </div>
  );
}
