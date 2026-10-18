import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { recordTrailVisit, titlePath, useDB } from "@/lib/store";
import { TABS, type TabKey } from "@/lib/tabs";
import type { Kind, Post, Question, Review } from "@/lib/types";
import { Empty, LoadMore, Poster, useCursor } from "./bits";
import { PostItem, QuestionCard, ReviewCard } from "./FeedItems";
import { Recometer } from "./Recometer";
import { TitleActions } from "./TitleActions";
import { DiscoveryBlurb } from "./DiscoveryBlurb";
import { GenreSheet } from "./GenreSheet";
import { FloatingComposer } from "./FloatingComposer";

export function TitlePage({ kind, slug, tab }: { kind: Kind; slug: string; tab: TabKey }) {
  const db = useDB();
  const navigate = useNavigate();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const title = db.titles.find((t) => t.slug === slug && t.kind === kind);
  const redirectTo = !title ? db.slugRedirects[slug] : undefined;

  useEffect(() => {
    if (title && title.status === "published" && db.sessionUserId) recordTrailVisit(db.sessionUserId, title.id);
  }, [title?.id, title?.status, db.sessionUserId]);

  useEffect(() => {
    if (redirectTo) {
      const t = db.titles.find((x) => x.slug === redirectTo);
      if (t)
        navigate({ to: titlePath(t), params: { slug: t.slug }, search: { tab }, replace: true });
    }
  }, [redirectTo]);

  const cfg = TABS.find((t) => t.key === tab) ?? TABS[0];

  type Item =
    { kind: "review"; r: Review } | { kind: "question"; q: Question } | { kind: "post"; p: Post };
  const items = useMemo((): Item[] => {
    if (!title) return [];
    const by = (a: { createdAt: string }, b: { createdAt: string }) =>
      b.createdAt.localeCompare(a.createdAt);
    if (cfg.key === "reviews")
      return db.reviews
        .filter((r) => r.titleId === title.id && !r.removed)
        .sort(by)
        .map((r) => ({ kind: "review" as const, r }));
    if (cfg.key === "questions")
      return db.questions
        .filter((q) => q.titleId === title.id && !q.removed)
        .sort(by)
        .map((q) => ({ kind: "question" as const, q }));
    return db.posts
      .filter((p) => p.titleId === title.id && p.category === cfg.category && !p.removed)
      .sort(by)
      .map((p) => ({ kind: "post" as const, p }));
  }, [db, title?.id, cfg.key]);

  const { visible, hasMore, more } = useCursor(items, 10);

  if (!title || title.status !== "published") {
    return <Empty>{redirectTo ? "Taking you there…" : "This title isn't available."}</Empty>;
  }

  const directors = title.people.filter((p) => p.role === "director" || p.role === "creator");
  const cast = title.people.filter((p) => p.role === "cast");
  const word = kind === "movie" ? "movie" : "series";
  const count = items.length;
  const countLabel = `${count} ${count === 1 ? "contribution" : "contributions"}`;
  const editorialDescription =
    cfg.key === "lessons"
      ? count
        ? `${count} ${count === 1 ? "lesson" : "lessons"} viewers learned from ${title.name}.`
        : `Every story teaches us something. What did ${title.name} teach you?`
      : cfg.key === "quotes"
        ? count
          ? `${count} memorable ${count === 1 ? "quote" : "quotes"} from ${title.name} worth revisiting.`
          : `Which words from ${title.name} stayed with you?`
        : cfg.key === "reviews"
          ? count
            ? `See what ${count} ${count === 1 ? "viewer thinks" : "viewers think"} about ${title.name}.`
            : `What did you think of ${title.name}?`
          : cfg.key === "questions"
            ? count
              ? `${count} ${count === 1 ? "question" : "questions"} viewers are asking about ${title.name}.`
              : `What would you like to know about ${title.name}?`
            : cfg.key === "moments"
              ? count
                ? `${count} ${count === 1 ? "moment" : "moments"} from ${title.name} that viewers can't forget.`
                : `Which moment from ${title.name} stayed with you?`
              : cfg.key === "director"
                ? `What viewers would tell the creators of ${title.name} if they had the chance.`
                : count
                  ? `${countLabel} about the trailer for ${title.name}.`
                  : `What did you think of the trailer for ${title.name}?`;

  return (
    <div className="mx-auto max-w-2xl">
      <section className="flex gap-5 pt-6 md:gap-8 md:pt-10">
        <Poster title={title} size="md" className="w-28 shrink-0 md:w-40" />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {word} · {title.year}
          </p>
          <h1 className="mt-1 text-4xl leading-[1.02] md:text-5xl">{title.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {title.genres.map((genre, index) => (
              <span key={genre} className="inline-flex items-center gap-2">
                {index > 0 && <span aria-hidden>·</span>}
                <button
                  type="button"
                  className="border-b border-transparent transition-colors hover:border-current hover:text-foreground"
                  onClick={() => setSelectedGenre(genre)}
                >
                  {genre}
                </button>
              </span>
            ))}
          </div>
          {directors.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {kind === "movie" ? "Directed by" : "Created by"}{" "}
              {Array.from(new Set(directors.map((d) => d.name))).join(", ")}
            </p>
          )}
        </div>
      </section>
      <DiscoveryBlurb title={title} />
      <GenreSheet
        genre={selectedGenre ?? ""}
        open={selectedGenre !== null}
        onClose={() => setSelectedGenre(null)}
      />
      <div className="mt-4">
        <TitleActions title={title} />
      </div>

      <Collapsible className="mt-4 border-y">
        <CollapsibleTrigger className="group flex w-full items-center justify-between py-3 text-sm text-muted-foreground hover:text-foreground">
          About this {kind === "movie" ? "movie" : "series"}
          <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pb-4 text-sm">
          <dl className="grid grid-cols-[7rem_1fr] gap-y-2">
            {cast.length > 0 && (
              <>
                <dt className="text-muted-foreground">Cast</dt>
                <dd>
                  {cast
                    .map((c) => (c.character ? `${c.name} (${c.character})` : c.name))
                    .join(", ")}
                </dd>
              </>
            )}
            {title.runtime && (
              <>
                <dt className="text-muted-foreground">Runtime</dt>
                <dd>{title.runtime}</dd>
              </>
            )}
            {title.country && (
              <>
                <dt className="text-muted-foreground">Country</dt>
                <dd>{title.country}</dd>
              </>
            )}
            {title.language && (
              <>
                <dt className="text-muted-foreground">Language</dt>
                <dd>{title.language}</dd>
              </>
            )}
            {title.altNames.length > 0 && (
              <>
                <dt className="text-muted-foreground">Also known as</dt>
                <dd>{title.altNames.join(", ")}</dd>
              </>
            )}
          </dl>
        </CollapsibleContent>
      </Collapsible>

      <Recometer title={title} />

      <nav
        aria-label="Community"
        className="no-scrollbar sticky top-14 z-30 -mx-4 mt-2 flex gap-1 overflow-x-auto border-b bg-background/90 px-4 backdrop-blur"
      >
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
              t.key === cfg.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {cfg.key === "trailer" &&
        (title.trailerUrl ? (
          <div className="mt-4 aspect-video overflow-hidden rounded-lg bg-muted">
            <iframe
              src={title.trailerUrl}
              title={`${title.name} trailer`}
              className="h-full w-full"
              loading="lazy"
              allow="encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No official trailer has been added yet.
          </p>
        ))}

      <p className="mt-5 text-base leading-relaxed text-muted-foreground">{editorialDescription}</p>

      <FloatingComposer title={title} tab={cfg} />

      <div>
        {visible.length === 0 && <Empty>{cfg.empty(kind)}</Empty>}
        {visible.map((it) =>
          it.kind === "review" ? (
            <ReviewCard key={it.r.id} review={it.r} />
          ) : it.kind === "question" ? (
            <QuestionCard key={it.q.id} question={it.q} />
          ) : (
            <PostItem key={it.p.id} post={it.p} />
          ),
        )}
        <LoadMore show={hasMore} onClick={more} />
      </div>
    </div>
  );
}
