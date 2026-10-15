import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { attempt, useAuth } from "@/lib/auth";
import { deleteCollection, moveInCollection, toggleInCollection, toggleSaveCollection, updateCollection, useCurrentUser, useDB } from "@/lib/store";
import { Empty, Poster, TitleLink, UserLink } from "@/components/bits";
import { CollectionCover } from "@/components/CollectionCard";
import { ShareButton } from "@/components/Engagement";
import { createSeed } from "@/lib/seed";

export const Route = createFileRoute("/collections/$slug")({
  head: ({ params }) => {
    const c = createSeed().collections.find((x) => x.slug === params.slug);
    const t = c ? `${c.name} — Inktella` : "Collection — Inktella";
    const d = c?.description ?? "A public collection of movies and series on Inktella.";
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: `/collections/${params.slug}` }],
    };
  },
  component: CollectionPage,
});

function CollectionPage() {
  const { slug } = Route.useParams();
  const db = useDB();
  const me = useCurrentUser();
  const { requireAuth } = useAuth();
  const navigate = useNavigate();
  const c = db.collections.find((x) => x.slug === slug);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c?.name ?? "");
  const [desc, setDesc] = useState(c?.description ?? "");
  if (!c) return <Empty>This collection isn't available.</Empty>;
  const owner = db.users.find((u) => u.id === c.userId);
  const mine = me?.id === c.userId;
  const saved = !!me && db.savedCollections.some((s) => s.userId === me.id && s.collectionId === c.id);
  const titles = c.titleIds.map((id) => db.titles.find((t) => t.id === id)).filter((t) => t && t.status === "published");

  return (
    <div className="mx-auto max-w-2xl pt-8">
      <div className="max-w-xs"><CollectionCover collection={c} /></div>
      {editing ? (
        <div className="mt-6 space-y-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="font-display text-2xl" />
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} rows={3} placeholder="Description (optional)" />
          <div className="flex gap-2">
            <Button size="sm" className="rounded-full" onClick={() => attempt(() => updateCollection(c.id, { name, description: desc })) && setEditing(false)}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <h1 className="mt-6 text-4xl leading-tight md:text-5xl">{c.name}</h1>
          {c.description && <p className="mt-2 text-muted-foreground">{c.description}</p>}
        </>
      )}
      <p className="mt-3 text-sm text-muted-foreground">
        By <UserLink user={owner} className="text-foreground" /> · Created {format(new Date(c.createdAt), "PP")} · Updated {format(new Date(c.updatedAt), "PP")}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!mine && (
          <Button size="sm" variant={saved ? "default" : "outline"} className="rounded-full" onClick={() => requireAuth(() => toggleSaveCollection(c.id), "Sign in to save collections.")}>
            {saved ? "Saved" : "Save collection"}
          </Button>
        )}
        {mine && !editing && <Button size="sm" variant="outline" className="rounded-full" onClick={() => { setName(c.name); setDesc(c.description ?? ""); setEditing(true); }}>Edit</Button>}
        {mine && (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
            if (window.confirm("Delete this collection?") && attempt(() => deleteCollection(c.id))) navigate({ to: "/collections" });
          }}>Delete</Button>
        )}
        <span className="ml-2"><ShareButton path={`/collections/${c.slug}`} /></span>
      </div>

      <ol className="mt-8 divide-y border-y">
        {titles.length === 0 && <Empty>Nothing here yet. Add titles from any movie or series page.</Empty>}
        {titles.map((t, i) => (
          <li key={t!.id} className="flex items-center gap-4 py-3">
            <span className="w-6 text-right font-display text-xl text-subtle">{i + 1}</span>
            <TitleLink title={t!} className="flex min-w-0 flex-1 items-center gap-4 hover:opacity-80">
              <Poster title={t!} size="xs" className="w-10 shrink-0" />
              <div className="min-w-0">
                <p className="truncate font-display text-xl">{t!.name}</p>
                <p className="text-sm text-muted-foreground">{t!.year} · {t!.kind === "movie" ? "Movie" : "Series"}</p>
              </div>
            </TitleLink>
            {mine && (
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => moveInCollection(c.id, i, -1)}><ArrowUp /></Button>
                <Button size="icon" variant="ghost" aria-label="Move down" disabled={i === titles.length - 1} onClick={() => moveInCollection(c.id, i, 1)}><ArrowDown /></Button>
                <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => toggleInCollection(c.id, t!.id)}><X /></Button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
