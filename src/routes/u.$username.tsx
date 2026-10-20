import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, Sparkles, UserPlus, UserRoundCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { attempt, useAuth } from "@/lib/auth";
import { canonicalUsername, toggleFollow, useCurrentUser, useDB, useStoreReady } from "@/lib/store";
import { Avatar, Empty, Poster, TitleLink } from "@/components/bits";
import { PostItem, QuestionCard, ReviewCard } from "@/components/FeedItems";
import { CollectionCard } from "@/components/CollectionCard";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Inktella` },
      { name: "description", content: `What @${params.username} has shared about movies and series on Inktella.` },
      { property: "og:title", content: `@${params.username} — Inktella` },
      { property: "og:description", content: `What @${params.username} has shared on Inktella.` },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { username } = Route.useParams();
  const db = useDB();
  const viewer = useCurrentUser();
  const { requireAuth } = useAuth();
  const ready = useStoreReady();
  const [tab, setTab] = useState<"activity" | "collections" | "watched">("activity");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState("Ella is getting to know this cinephile's unique journey…");
  const [aiLoading, setAiLoading] = useState(false);
  const profileUsername = canonicalUsername(username);
  const u = db.users.find((x) => canonicalUsername(x.username) === profileUsername);
  const trail = useMemo(() => {
    if (!u || u.showTrail === false) return [];
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return db.trail
      .filter((entry) => entry.userId === u.id && Date.parse(entry.visitedAt) >= cutoff)
      .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))
      .map((entry) => db.titles.find((title) => title.id === entry.titleId))
      .filter(Boolean);
  }, [db.trail, db.titles, u?.id, u?.showTrail]);
  if (!u) return <Empty>{ready ? "No one goes by that name here." : "Loading profile…"}</Empty>;

  const activity = [
    ...db.posts.filter((p) => p.userId === u.id && !p.removed).map((p) => ({ at: p.createdAt, el: <PostItem key={p.id} post={p} showTitle /> })),
    ...db.reviews.filter((r) => r.userId === u.id && !r.removed).map((r) => ({ at: r.createdAt, el: <ReviewCard key={r.id} review={r} showTitle /> })),
    ...db.questions.filter((q) => q.userId === u.id && !q.removed).map((q) => ({ at: q.createdAt, el: <QuestionCard key={q.id} question={q} showTitle /> })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const cols = db.collections.filter((c) => c.userId === u.id);
  const watched = db.library.filter((l) => l.userId === u.id && l.state === "watched").map((l) => db.titles.find((t) => t.id === l.titleId)).filter(Boolean);
  const watchedCount = watched.length;
  const viewerWatched = new Set(db.library.filter((entry) => entry.userId === viewer?.id && entry.state === "watched").map((entry) => entry.titleId));
  const ownerWatched = new Set(db.library.filter((entry) => entry.userId === u.id && entry.state === "watched").map((entry) => entry.titleId));
  const sharedTitleIds = [...ownerWatched].filter((titleId) => viewerWatched.has(titleId));
  const viewerFavorites = new Set(viewer?.favoriteTitleIds ?? []);
  const ownerFavorites = new Set(u.favoriteTitleIds ?? []);
  const sharedFavorites = [...ownerFavorites].filter((titleId) => viewerFavorites.has(titleId));
  const ownerCollections = db.collections.filter((collection) => collection.userId === u.id);
  const viewerCollections = db.collections.filter((collection) => collection.userId === viewer?.id);
  const ownerCollectionTitles = new Set(ownerCollections.flatMap((collection) => collection.titleIds));
  const viewerCollectionTitles = new Set(viewerCollections.flatMap((collection) => collection.titleIds));
  const sharedCollectionTitles = [...ownerCollectionTitles].filter((titleId) => viewerCollectionTitles.has(titleId));
  const sharedRecommendations = db.recommendations.filter((vote) => vote.userId === u.id && vote.value === "yes" && db.recommendations.some((other) => other.userId === viewer?.id && other.titleId === vote.titleId && other.value === "yes")).map((vote) => vote.titleId);
  const comparableTitles = new Set([...ownerWatched, ...ownerFavorites, ...ownerCollectionTitles]);
  const hasEnoughActivity = Boolean(viewer && (viewerWatched.size + viewerFavorites.size + viewerCollectionTitles.size > 0) && comparableTitles.size >= 2);
  const matchScore = hasEnoughActivity ? Math.min(99, Math.round(((sharedTitleIds.length + sharedFavorites.length * 1.5 + sharedCollectionTitles.length + sharedRecommendations.length * 2) / Math.max(1, comparableTitles.size + viewerWatched.size) * 100))) : null;
  const followed = Boolean(viewer && db.follows.some((follow) => follow.followerId === viewer.id && follow.followingId === u.id));
  const sharedTitles = sharedTitleIds.slice(0, 4).map((titleId) => db.titles.find((title) => title.id === titleId)).filter(Boolean);
  const loadEllaDescription = async () => {
    if (aiLoading) return;
    setAiOpen(true); setAiLoading(true);
    try { const response = await fetch("/api/ella/personality", { method: "POST" }); const data = await response.json() as { description?: string }; if (data.description) setAiDescription(data.description); } finally { setAiLoading(false); }
  };
  const stats = [
    { label: "Watched", value: watchedCount, tab: "watched" as const },
    { label: "Collections", value: cols.length, tab: "collections" as const },
    { label: "Posts shared", value: activity.length, tab: "activity" as const },
  ];

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <div className="relative isolate -mx-4 overflow-hidden px-4 pb-1 sm:-mx-6 sm:px-6">
        <header className="flex flex-col items-center pt-12 text-center sm:pt-16">
          <div className="rounded-[1.35rem] bg-background/60 p-1.5 shadow-sm backdrop-blur-sm">
            <Avatar user={u} size={104} />
          </div>
          <h1 className="mt-5 font-display text-4xl leading-tight tracking-tight sm:text-5xl">{u.displayName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">@{u.username}{u.status !== "active" && " · restricted"}</p>
          {u.bio && <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground">{u.bio}</p>}
        </header>

        <div className="mt-9 grid grid-cols-3 border-y border-border/70 py-4">
        {stats.map((stat) => (
          <button key={stat.label} type="button" onClick={() => setTab(stat.tab)} className="group flex min-h-14 flex-col items-center justify-center gap-0.5 border-r last:border-r-0" aria-label={`View ${stat.label}`}>
            <span className="font-display text-2xl leading-none transition-colors group-hover:text-primary">{stat.value}</span>
            <span className="text-[11px] text-muted-foreground">{stat.label}</span>
          </button>
        ))}
      </div>

      {u.favoriteTitleIds?.length ? (
        <section className="mt-8 border-b pb-7" aria-labelledby="favourite-films-heading">
          <div className="mb-3 flex items-center gap-3">
            <h2 id="favourite-films-heading" className="font-display text-lg text-primary">Favourite Films</h2>
            <span className="h-px flex-1 bg-primary/20" aria-hidden="true" />
          </div>
          <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
            {u.favoriteTitleIds.slice(0, 4).map((titleId) => {
              const title = db.titles.find((candidate) => candidate.id === titleId);
              if (!title) return null;
              return (
                <TitleLink key={title.id} title={title} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <Poster title={title} size="xs" className="rounded-lg shadow-sm transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-md" />
                  <span className="sr-only">{title.name}</span>
                </TitleLink>
              );
            })}
          </div>
        </section>
      ) : null}

      {trail.length > 0 && (
        <section className="mt-7 border-b pb-7" aria-labelledby="trail-heading">
          <h2 id="trail-heading" className="mb-3 font-display text-lg text-primary">The Trail</h2>
          <div className="flex snap-x gap-2.5 overflow-x-auto overscroll-x-contain pb-1 sm:gap-4" aria-label="Recently visited titles">
            {trail.map((title) => title && (
              <TitleLink key={title.id} title={title} className="group block w-[calc((100vw-5rem)/4)] min-w-[calc((100vw-5rem)/4)] snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-[calc((100%-3rem)/4)] sm:min-w-[calc((100%-3rem)/4)]">
                <Poster title={title} size="xs" className="rounded-lg shadow-sm transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-md" />
                <span className="sr-only">{title.name}</span>
              </TitleLink>
            ))}
          </div>
        </section>
      )}

      {viewer && viewer.id !== u.id ? (
        <section className="mt-7 border-b pb-7" aria-labelledby="follow-along-heading">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary">A shared way in</p>
              <h2 id="follow-along-heading" className="mt-1 font-display text-2xl">Follow Along</h2>
            </div>
            <button type="button" onClick={() => requireAuth(() => attempt(() => toggleFollow(u.id), followed ? "Unfollowed." : "Now following."), "Sign in to follow this cinephile.")} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/40 px-3 py-2 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground" aria-label={followed ? `Following ${u.displayName}` : `Follow ${u.displayName}`}>
              {followed ? <UserRoundCheck className="size-3.5" aria-hidden="true" /> : <UserPlus className="size-3.5" aria-hidden="true" />}
              {followed ? "Following" : "Follow"}
            </button>
          </div>
          {matchScore !== null ? (
            <div className="mt-5 animate-in fade-in slide-in-from-bottom-1 duration-500">
              <div className="flex items-end gap-3">
                <span className="font-display text-5xl leading-none text-primary">{matchScore}%</span>
                <p className="pb-1 text-sm text-muted-foreground">taste match</p>
              </div>
              <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                {sharedRecommendations.length > 0 ? "You both champion some of the same discoveries." : sharedTitleIds.length > 0 ? `You have ${sharedTitleIds.length} watched ${sharedTitleIds.length === 1 ? "title" : "titles"} in common.` : "Your collections and favourites are beginning to overlap."}
              </p>
              {sharedTitles.length > 0 && <div className="mt-4 flex gap-2" aria-label="Shared watched titles">{sharedTitles.map((title) => title && <TitleLink key={title.id} title={title} aria-label={title.name}><Poster title={title} size="xs" className="w-12 rounded-md" /></TitleLink>)}</div>}
            </div>
          ) : <p className="mt-4 text-sm leading-6 text-muted-foreground">There is not quite enough shared activity to make a meaningful comparison yet. Keep exploring and this will become more personal.</p>}
        </section>
      ) : null}

      <section className="mt-6 border-b pb-5" aria-label="AI profile description">
        <button type="button" onClick={() => { if (!aiOpen) void loadEllaDescription(); else setAiOpen(false); }} aria-expanded={aiOpen} className="flex w-full items-start gap-3 text-left">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Ella says I&apos;m…</span>
            <span className={cn("mt-1 block text-sm leading-6 text-muted-foreground", !aiOpen && "line-clamp-1")}>{aiDescription}</span>
          </span>
          <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", aiOpen && "rotate-180")} aria-hidden="true" />
        </button>
      </section>

      <nav className="mt-5 flex gap-6 border-b" aria-label="Profile sections">
        {(["activity", "collections", "watched"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cn("border-b-2 px-0.5 pb-3 text-sm capitalize transition-colors", tab === k ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{k}</button>
        ))}
      </nav>

        <div className="pt-1">
          {tab === "activity" && (activity.length ? activity.map((a) => a.el) : <Empty>Nothing shared yet.</Empty>)}
          {tab === "collections" && (cols.length ? <div className="mt-6 grid gap-6 sm:grid-cols-2">{cols.map((c) => <CollectionCard key={c.id} collection={c} />)}</div> : <Empty>No collections yet.</Empty>)}
          {tab === "watched" && (watched.length ? (
            <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">{watched.map((t) => <TitleLink key={t!.id} title={t!}><Poster title={t!} size="sm" /></TitleLink>)}</div>
          ) : <Empty>Nothing marked as watched yet.</Empty>)}
        </div>
      </div>
    </div>
  );
}
