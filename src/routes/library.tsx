import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useCurrentUser, useDB } from "@/lib/store";
import { Empty, PageHeader, Poster, TitleLink } from "@/components/bits";
import { CollectionCard } from "@/components/CollectionCard";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Your library — Inktella" },
      { name: "description", content: "Your watched titles, watchlist and collections." },
      { property: "og:title", content: "Your library — Inktella" },
      { property: "og:description", content: "Your watched titles, watchlist and collections." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const db = useDB();
  const me = useCurrentUser();
  const { openAuth } = useAuth();
  const [tab, setTab] = useState<"watched" | "want" | "collections">("watched");
  if (!me)
    return (
      <div className="py-20 text-center">
        <h1 className="text-4xl">Your library</h1>
        <p className="mt-2 text-muted-foreground">Sign in to keep track of what you've watched.</p>
        <Button className="mt-6 rounded-full" onClick={() => openAuth("signin")}>Sign in</Button>
      </div>
    );

  const list = (s: "watched" | "want") =>
    db.library.filter((l) => l.userId === me.id && l.state === s).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((l) => db.titles.find((t) => t.id === l.titleId)).filter(Boolean);
  const mine = db.collections.filter((c) => c.userId === me.id);
  const saved = db.savedCollections.filter((s) => s.userId === me.id).map((s) => db.collections.find((c) => c.id === s.collectionId)).filter(Boolean);

  return (
    <div>
      <PageHeader title="Your library" sub={<>Hi {me.displayName}. <Link to="/u/$username" params={{ username: me.username }} className="underline underline-offset-4">View public profile</Link></>} />
      <div className="flex gap-1 border-b">
        {([["watched", "Watched"], ["want", "Want to watch"], ["collections", "Collections"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("border-b-2 px-3 py-3 text-sm", tab === k ? "border-foreground" : "border-transparent text-muted-foreground")}>{l}</button>
        ))}
      </div>
      {tab !== "collections" ? (
        list(tab).length ? (
          <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
            {list(tab).map((t) => (
              <TitleLink key={t!.id} title={t!}>
                <Poster title={t!} size="sm" />
                <p className="mt-1.5 truncate text-sm">{t!.name}</p>
              </TitleLink>
            ))}
          </div>
        ) : <Empty>{tab === "watched" ? "Mark titles as watched from their pages." : "Save titles you'd like to watch later."}</Empty>
      ) : (
        <div className="mt-6 space-y-10">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {mine.map((c) => <CollectionCard key={c.id} collection={c} />)}
            {mine.length === 0 && <p className="text-muted-foreground">You haven't made a collection yet. <Link to="/collections" className="underline">Start one</Link>.</p>}
          </div>
          {saved.length > 0 && (
            <div>
              <h2 className="text-2xl">Saved</h2>
              <div className="mt-4 grid gap-6 sm:grid-cols-2 md:grid-cols-3">{saved.map((c) => <CollectionCard key={c!.id} collection={c!} />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
