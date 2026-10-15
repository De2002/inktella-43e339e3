import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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

  return (
    <div className="mx-auto max-w-2xl">
      <header className="flex items-center gap-4 pt-8">
        <Avatar user={u} size={64} />
        <div>
          <h1 className="text-4xl leading-none">{u.displayName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">@{u.username}{u.status !== "active" && " · restricted"}</p>
        </div>
      </header>
      {u.bio && <p className="mt-4 leading-relaxed">{u.bio}</p>}
      <div className="mt-6 flex gap-1 border-b">
        {(["activity", "collections", "watched"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={cn("border-b-2 px-3 py-3 text-sm capitalize", tab === k ? "border-foreground" : "border-transparent text-muted-foreground")}>{k}</button>
        ))}
      </div>
      {tab === "activity" && (activity.length ? activity.map((a) => a.el) : <Empty>Nothing shared yet.</Empty>)}
      {tab === "collections" && (cols.length ? <div className="mt-6 grid gap-6 sm:grid-cols-2">{cols.map((c) => <CollectionCard key={c.id} collection={c} />)}</div> : <Empty>No collections yet.</Empty>)}
      {tab === "watched" && (watched.length ? (
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">{watched.map((t) => <TitleLink key={t!.id} title={t!}><Poster title={t!} size="sm" /></TitleLink>)}</div>
      ) : <Empty>Nothing marked as watched yet.</Empty>)}
    </div>
  );
}
