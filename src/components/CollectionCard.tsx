import { Link } from "@tanstack/react-router";
import { useDB } from "@/lib/store";
import type { Collection } from "@/lib/types";
import { Poster } from "./bits";

export function CollectionCover({ collection }: { collection: Collection }) {
  const db = useDB();
  const ts = collection.titleIds.map((id) => db.titles.find((t) => t.id === id)).filter(Boolean).slice(0, 4);
  return (
    <div className="grid aspect-[4/3] grid-cols-4 gap-1 overflow-hidden rounded-lg bg-muted p-1">
      {ts.map((t) => <Poster key={t!.id} title={t!} size="xs" className="h-full rounded-sm" />)}
    </div>
  );
}

export function CollectionCard({ collection }: { collection: Collection }) {
  const db = useDB();
  const owner = db.users.find((u) => u.id === collection.userId);
  return (
    <Link to="/collections/$slug" params={{ slug: collection.slug }} className="group block">
      <CollectionCover collection={collection} />
      <h3 className="mt-2 text-xl leading-tight group-hover:underline">{collection.name}</h3>
      <p className="text-sm text-muted-foreground">{owner?.displayName ?? "Former member"} · {collection.titleIds.length} titles</p>
    </Link>
  );
}
