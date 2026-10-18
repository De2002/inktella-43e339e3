import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDB } from "@/lib/store";
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
  const [tab, setTab] = useState<"activity" | "collections" | "watched">("activity");
  const u = db.users.find((x) => x.username === username);
  if (!u) return <Empty>No one goes by that name here.</Empty>;

  const activity = [
    ...db.posts.filter((p) => p.userId === u.id && !p.removed).map((p) => ({ at: p.createdAt, el: <PostItem key={p.id} post={p} showTitle /> })),
    ...db.reviews.filter((r) => r.userId === u.id && !r.removed).map((r) => ({ at: r.createdAt, el: <ReviewCard key={r.id} review={r} showTitle /> })),
    ...db.questions.filter((q) => q.userId === u.id && !q.removed).map((q) => ({ at: q.createdAt, el: <QuestionCard key={q.id} question={q} showTitle /> })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const cols = db.collections.filter((c) => c.userId === u.id);
  const watched = db.library.filter((l) => l.userId === u.id && l.state === "watched").map((l) => db.titles.find((t) => t.id === l.titleId)).filter(Boolean);

  const [aiOpen, setAiOpen] = useState(false);
  const watchedCount = watched.length;
  const aiDescription = `${u.displayName} is drawn to stories with a strong point of view, memorable performances, and details worth talking about. They have watched ${watchedCount} title${watchedCount === 1 ? "" : "s"} on Inktella and enjoy sharing the moments, lessons, and questions that stay with them.`;
  const stats = [
    { label: "Watched", value: watchedCount, tab: "watched" as const },
    { label: "Collections", value: cols.length, tab: "collections" as const },
    { label: "Posts shared", value: activity.length, tab: "activity" as const },
  ];

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <div className="relative isolate -mx-4 overflow-hidden px-4 pb-1 sm:-mx-6 sm:px-6">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[27rem] bg-cover bg-center opacity-80"
          style={{ backgroundImage: "url('/profile-hero.png')" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(18,18,20,0.08)_0%,rgba(18,18,20,0.28)_38%,hsl(var(--background))_88%,hsl(var(--background))_100%)]"
          aria-hidden="true"
        />

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

      <section className="mt-6 border-b pb-5" aria-label="AI profile description">
        <button type="button" onClick={() => setAiOpen((open) => !open)} aria-expanded={aiOpen} className="flex w-full items-start gap-3 text-left">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">AI says I&apos;m…</span>
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
