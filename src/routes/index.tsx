import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useDB } from "@/lib/store";
import { LoadMore, Poster, TitleLink, useCursor } from "@/components/bits";
import { PostItem, QuestionCard, ReviewCard } from "@/components/FeedItems";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inktella — what stayed with you after the credits" },
      { name: "description", content: "Read what everyday viewers learned, loved and wondered about movies and series. A calm community with no ratings." },
      { property: "og:title", content: "Inktella — what stayed with you after the credits" },
      { property: "og:description", content: "Lessons, quotes, moments, reviews and questions from everyday viewers. No ratings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type Filter = "all" | "posts" | "reviews" | "questions";

function Home() {
  const db = useDB();
  const [filter, setFilter] = useState<Filter>("all");
  const live = new Set(db.titles.filter((t) => t.status === "published").map((t) => t.id));

  const feed = useMemo(() => {
    const all = [
      ...(filter === "all" || filter === "posts" ? db.posts.filter((p) => !p.removed && live.has(p.titleId)).map((p) => ({ k: "p" as const, at: p.createdAt, p })) : []),
      ...(filter === "all" || filter === "reviews" ? db.reviews.filter((r) => !r.removed && live.has(r.titleId)).map((r) => ({ k: "r" as const, at: r.createdAt, r })) : []),
      ...(filter === "all" || filter === "questions" ? db.questions.filter((q) => !q.removed && live.has(q.titleId)).map((q) => ({ k: "q" as const, at: q.createdAt, q })) : []),
    ];
    return all.sort((a, b) => b.at.localeCompare(a.at));
  }, [db, filter]);
  const { visible, hasMore, more } = useCursor(feed, 12);
  const featured = db.titles.filter((t) => t.status === "published").slice(0, 8);

  return (
    <div className="mx-auto max-w-2xl">
      <section className="pb-6 pt-8 md:pt-14">
        <h1 className="text-4xl leading-[1.05] md:text-6xl">What stayed with you<br className="hidden md:block" /> after the credits?</h1>
        <p className="mt-3 max-w-md text-muted-foreground">You don't have to be a critic to have something worth saying about a movie.</p>
      </section>

      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {featured.map((t) => (
          <TitleLink key={t.id} title={t} className="w-24 shrink-0 transition-opacity hover:opacity-90">
            <Poster title={t} size="sm" />
          </TitleLink>
        ))}
        <Link to="/explore" className="flex w-24 shrink-0 items-center justify-center rounded-md border text-sm text-muted-foreground hover:text-foreground">Explore all</Link>
      </div>

      <div className="sticky top-14 z-30 -mx-4 mt-6 flex gap-1 border-b bg-background/90 px-4 backdrop-blur">
        {(["all", "posts", "reviews", "questions"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn("border-b-2 px-3 py-3 text-sm capitalize", filter === f ? "border-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {f === "posts" ? "Thoughts" : f}
          </button>
        ))}
      </div>
      {visible.map((it) =>
        it.k === "p" ? <PostItem key={it.p.id} post={it.p} showTitle /> :
        it.k === "r" ? <ReviewCard key={it.r.id} review={it.r} showTitle /> :
        <QuestionCard key={it.q.id} question={it.q} showTitle />,
      )}
      <LoadMore show={hasMore} onClick={more} />
    </div>
  );
}
