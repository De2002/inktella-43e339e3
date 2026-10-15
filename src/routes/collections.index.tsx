import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { attempt, useAuth } from "@/lib/auth";
import { createCollection, useDB } from "@/lib/store";
import { PageHeader } from "@/components/bits";
import { CollectionCard } from "@/components/CollectionCard";

export const Route = createFileRoute("/collections/")({
  head: () => ({
    meta: [
      { title: "Collections — Inktella" },
      { name: "description", content: "Public lists of movies and series curated by Inktella members." },
      { property: "og:title", content: "Collections — Inktella" },
      { property: "og:description", content: "Public lists of movies and series curated by Inktella members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Collections,
});

function Collections() {
  const db = useDB();
  const { requireAuth } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const list = [...db.collections].filter((c) => c.titleIds.length).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <PageHeader title="Collections" sub="Lists made by people who love stories." />
        <Button className="mb-6 rounded-full" onClick={() => requireAuth(() => setOpen(true), "Sign in to create a collection.")}>New collection</Button>
      </div>
      <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
        {list.map((c) => <CollectionCard key={c.id} collection={c} />)}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display text-3xl font-normal">New collection</DialogTitle></DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              let slug = "";
              if (attempt(() => { slug = createCollection(name, desc); })) {
                setOpen(false);
                navigate({ to: "/collections/$slug", params: { slug } });
              }
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Movies That Taught Me Something" maxLength={100} required />
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" maxLength={500} rows={3} />
            <Button type="submit" className="w-full rounded-full">Create</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
