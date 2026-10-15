import { useState } from "react";
import { Bookmark, Check, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { attempt, useAuth } from "@/lib/auth";
import { createCollection, setLibrary, toggleInCollection, useCurrentUser, useDB } from "@/lib/store";
import type { Title } from "@/lib/types";

export function TitleActions({ title }: { title: Title }) {
  const db = useDB();
  const me = useCurrentUser();
  const { requireAuth } = useAuth();
  const state = me && db.library.find((l) => l.userId === me.id && l.titleId === title.id)?.state;
  const mine = me ? db.collections.filter((c) => c.userId === me.id) : [];
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  const pill = "rounded-full";
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant={state === "watched" ? "default" : "outline"}
        className={pill}
        aria-pressed={state === "watched"}
        onClick={() => requireAuth(() => setLibrary(title.id, "watched"), "Sign in to keep track of what you've watched.")}
      >
        <Check /> Watched
      </Button>
      <Button
        size="sm"
        variant={state === "want" ? "default" : "outline"}
        className={pill}
        aria-pressed={state === "want"}
        onClick={() => requireAuth(() => setLibrary(title.id, "want"), "Sign in to save titles for later.")}
      >
        <Bookmark /> Want to watch
      </Button>
      <Popover open={open} onOpenChange={(o) => (o ? requireAuth(() => setOpen(true), "Sign in to build collections.") : setOpen(false))}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className={pill}><Plus /> Collection</Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <p className="mb-2 text-sm font-medium">Add to a collection</p>
          <div className="max-h-56 space-y-1 overflow-auto">
            {mine.length === 0 && <p className="text-sm text-muted-foreground">You don't have any collections yet.</p>}
            {mine.map((c) => {
              const inIt = c.titleIds.includes(title.id);
              return (
                <button
                  key={c.id}
                  onClick={() => attempt(() => toggleInCollection(c.id, title.id))}
                  className={cn("flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent")}
                >
                  <span className="truncate">{c.name}</span>
                  {inIt && <Check className="size-4" />}
                </button>
              );
            })}
          </div>
          <form
            className="mt-3 flex gap-2 border-t pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (attempt(() => createCollection(name, undefined, [title.id]), "Collection created")) setName("");
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New collection" className="h-8" maxLength={100} />
            <Button size="sm" type="submit" disabled={!name.trim()}>Add</Button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
