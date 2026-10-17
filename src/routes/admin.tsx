import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { attempt } from "@/lib/auth";
import {
  assignDiscoveryTags, findDuplicate, moderateContent, resolveReport, saveDiscoveryTag, saveTitle, setTitleStatus, setUserStatus, slugify, useCurrentUser, useDB, type TitleInput,
} from "@/lib/store";
import type { DB, Person, TargetType, Title } from "@/lib/types";
import { Empty, PageHeader, Poster, TitleLink } from "@/components/bits";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Inktella" },
      { name: "description", content: "Manage the Inktella catalog and community." },
      { property: "og:title", content: "Admin — Inktella" },
      { property: "og:description", content: "Manage the Inktella catalog and community." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

type Tab = "titles" | "discovery" | "reports" | "users" | "history";

function Admin() {
  const me = useCurrentUser();
  const [tab, setTab] = useState<Tab>("titles");
  if (!me || me.role !== "admin") return <Empty>This area is for administrators.</Empty>;
  return (
    <div>
      <PageHeader title="Admin" sub="Catalog and community care." />
      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b">
        {(["titles", "discovery", "reports", "users", "history"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("border-b-2 px-3 py-3 text-sm capitalize", tab === t ? "border-foreground" : "border-transparent text-muted-foreground")}>{t}</button>
        ))}
      </div>
      {tab === "titles" && <Titles />}
      {tab === "discovery" && <Discovery />}
      {tab === "reports" && <Reports />}
      {tab === "users" && <Users />}
      {tab === "history" && <History />}
    </div>
  );
}

const blank: TitleInput = { slug: "", kind: "movie", name: "", altNames: [], year: new Date().getUTCFullYear(), genres: [], synopsis: "", people: [], status: "unpublished", hue: 220 };

function peopleToText(p: Person[]) {
  return p.map((x) => `${x.role}: ${x.name}${x.character ? ` as ${x.character}` : ""}`).join("\n");
}
function textToPeople(s: string): Person[] {
  return s.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(director|creator|writer|cast)\s*:\s*(.+?)(?:\s+as\s+(.+))?$/i);
    if (!m) return { role: "cast" as const, name: l };
    return { role: m[1].toLowerCase() as Person["role"], name: m[2].trim(), character: m[3]?.trim() };
  });
}

function TitleForm({ initial, id, onDone }: { initial: TitleInput; id?: string; onDone: () => void }) {
  const [f, setF] = useState(initial);
  const [people, setPeople] = useState(peopleToText(initial.people));
  const set = <K extends keyof TitleInput>(k: K, v: TitleInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const dup = f.name.trim() ? findDuplicate(f.name, Number(f.year), id) : undefined;

  const save = () => {
    if (dup && !window.confirm(`“${dup.name} (${dup.year})” already exists. Save anyway?`)) return;
    attempt(() => saveTitle({ ...f, year: Number(f.year), people: textToPeople(people), slug: f.slug || slugify(`${f.name}-${f.year}`) }, id), id ? "Title updated" : "Title created") && onDone();
  };

  return (
    <div className="space-y-4 rounded-xl border p-4 md:p-6">
      <div className="flex gap-4">
        <Poster title={{ ...f, name: f.name || "Untitled" }} size="sm" className="w-24 shrink-0" />
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label>Title</Label><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Type</Label>
            <select value={f.kind} onChange={(e) => set("kind", e.target.value as Title["kind"])} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
              <option value="movie">Movie</option><option value="series">Series</option>
            </select>
          </div>
          <div className="space-y-1.5"><Label>Release year</Label><Input inputMode="numeric" value={f.year} onChange={(e) => set("year", Number(e.target.value.replace(/\D/g, "").slice(0, 4)) || 0)} /></div>
        </div>
      </div>
      {dup && <p className="text-sm text-destructive">Possible duplicate: {dup.name} ({dup.year}) already exists.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>URL slug</Label><Input value={f.slug} placeholder={slugify(`${f.name}-${f.year}`)} onChange={(e) => set("slug", e.target.value)} /><p className="text-xs text-subtle">Changing it keeps the old link working.</p></div>
        <div className="space-y-1.5"><Label>Alternate titles (comma separated)</Label><Input value={f.altNames.join(", ")} onChange={(e) => set("altNames", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /></div>
        <div className="space-y-1.5"><Label>Genres (comma separated)</Label><Input value={f.genres.join(", ")} onChange={(e) => set("genres", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /></div>
        <div className="space-y-1.5"><Label>Trailer embed URL</Label><Input value={f.trailerUrl ?? ""} placeholder="https://www.youtube.com/embed/…" onChange={(e) => set("trailerUrl", e.target.value || undefined)} /></div>
        <div className="space-y-1.5"><Label>Runtime</Label><Input value={f.runtime ?? ""} onChange={(e) => set("runtime", e.target.value || undefined)} /></div>
        <div className="space-y-1.5"><Label>Country</Label><Input value={f.country ?? ""} onChange={(e) => set("country", e.target.value || undefined)} /></div>
        <div className="space-y-1.5"><Label>Language</Label><Input value={f.language ?? ""} onChange={(e) => set("language", e.target.value || undefined)} /></div>
        <div className="space-y-1.5"><Label>Poster tone</Label><input type="range" min={0} max={359} value={f.hue} onChange={(e) => set("hue", Number(e.target.value))} className="w-full" /></div>
      </div>
      <div className="space-y-1.5"><Label>Synopsis</Label><Textarea rows={3} value={f.synopsis} onChange={(e) => set("synopsis", e.target.value)} /></div>
      <DiscoveryAssignment titleId={id} />
      <div className="space-y-1.5"><Label>People (one per line: “director: Name” or “cast: Name as Character”)</Label><Textarea rows={4} value={people} onChange={(e) => setPeople(e.target.value)} /></div>
      <div className="flex flex-wrap items-center gap-3">
        <select value={f.status} onChange={(e) => set("status", e.target.value as Title["status"])} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="unpublished">Unpublished</option><option value="published">Published</option><option value="archived">Archived</option>
        </select>
        <Button className="rounded-full" onClick={save}>{id ? "Save changes" : "Create title"}</Button>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

function DiscoveryAssignment({ titleId }: { titleId?: string }) {
  const db = useDB();
  const [selected, setSelected] = useState<string[]>(titleId ? db.titleDiscoveryTags.filter((item) => item.titleId === titleId).map((item) => item.tagId) : []);
  if (!titleId) return <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Save this title first to assign discovery tags.</p>;
  return <div className="space-y-2 rounded-lg border p-3"><Label>Internal discovery tags</Label><div className="flex flex-wrap gap-2">{db.discoveryTags.map((tag) => <label key={tag.id} className={cn("cursor-pointer rounded-full border px-3 py-1.5 text-xs", selected.includes(tag.id) && "border-foreground bg-foreground text-background")}><input className="sr-only" type="checkbox" checked={selected.includes(tag.id)} onChange={() => setSelected((items) => items.includes(tag.id) ? items.filter((item) => item !== tag.id) : [...items, tag.id])} />{tag.name}</label>)}</div><Button size="sm" variant="outline" onClick={() => attempt(() => assignDiscoveryTags(titleId, selected), "Tags saved")}>Save tags</Button></div>;
}

function Discovery() {
  const db = useDB();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [aliases, setAliases] = useState("");
  return <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"><div><h2 className="font-display text-2xl">Discovery tags</h2><p className="mt-1 text-sm text-muted-foreground">Private story concepts shared across movies and series.</p><ul className="mt-4 divide-y border-y">{db.discoveryTags.map((tag) => <li key={tag.id} className="py-3"><div className="flex items-center justify-between gap-3"><div><p className="font-medium">{tag.name}</p><p className="text-xs text-muted-foreground">{tag.description ?? "No description"} · {db.titleDiscoveryTags.filter((item) => item.tagId === tag.id).length} titles</p>{tag.aliases.length > 0 && <p className="mt-1 text-xs text-subtle">Also: {tag.aliases.join(", ")}</p>}</div></div></li>)}</ul></div><div className="h-fit rounded-xl border p-4"><h3 className="font-medium">Create a tag</h3><div className="mt-3 flex flex-col gap-3"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Second chances" /><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional description" rows={3} /><Input value={aliases} onChange={(event) => setAliases(event.target.value)} placeholder="Aliases, comma separated" /><Button onClick={() => { if (attempt(() => saveDiscoveryTag({ name, description, aliases: aliases.split(",").map((alias) => alias.trim()).filter(Boolean) }), "Tag created")) { setName(""); setDescription(""); setAliases(""); } }}>Create tag</Button></div></div></div>;
}

function Titles() {
  const db = useDB();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [q, setQ] = useState("");
  const list = db.titles.filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  const current = editing && editing !== "new" ? db.titles.find((t) => t.id === editing) : undefined;

  if (editing) {
    const { id: _id, createdAt: _c, ...rest } = current ?? ({ ...blank, id: "", createdAt: "" } as Title);
    return <div className="mt-6"><TitleForm key={editing} initial={rest} id={current?.id} onDone={() => setEditing(null)} /></div>;
  }

  return (
    <div className="mt-6">
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter titles" className="max-w-xs" />
        <Button className="ml-auto rounded-full" onClick={() => setEditing("new")}>New title</Button>
      </div>
      <p className="mt-2 text-xs text-subtle">Metadata import from a movie database (e.g. TMDB) arrives with the backend connection.</p>
      <ul className="mt-4 divide-y border-y">
        {list.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <Poster title={t} size="xs" className="w-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <TitleLink title={t} className="truncate font-medium hover:underline">{t.name}</TitleLink>
              <p className="text-xs text-muted-foreground">{t.year} · {t.kind} · /{t.kind}/{t.slug}</p>
            </div>
            <select aria-label="Status" value={t.status} onChange={(e) => attempt(() => setTitleStatus(t.id, e.target.value as Title["status"]))} className={cn("h-8 rounded-md border bg-background px-2 text-xs", t.status !== "published" && "text-muted-foreground")}>
              <option value="published">Published</option><option value="unpublished">Unpublished</option><option value="archived">Archived</option>
            </select>
            <Button size="sm" variant="ghost" onClick={() => setEditing(t.id)}>Edit</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function findTarget(db: DB, type: TargetType, id: string): { text: string; removed?: boolean } | undefined {
  const m = {
    post: db.posts.find((x) => x.id === id) && { text: db.posts.find((x) => x.id === id)!.body, removed: db.posts.find((x) => x.id === id)!.removed },
    review: db.reviews.find((x) => x.id === id) && { text: db.reviews.find((x) => x.id === id)!.body, removed: db.reviews.find((x) => x.id === id)!.removed },
    question: db.questions.find((x) => x.id === id) && { text: db.questions.find((x) => x.id === id)!.text, removed: db.questions.find((x) => x.id === id)!.removed },
    answer: db.answers.find((x) => x.id === id) && { text: db.answers.find((x) => x.id === id)!.body, removed: db.answers.find((x) => x.id === id)!.removed },
    reply: db.replies.find((x) => x.id === id) && { text: db.replies.find((x) => x.id === id)!.body, removed: db.replies.find((x) => x.id === id)!.removed },
  };
  return m[type] || undefined;
}

function Reports() {
  const db = useDB();
  const reports = [...db.reports].sort((a, b) => Number(a.status === "resolved") - Number(b.status === "resolved") || b.createdAt.localeCompare(a.createdAt));
  if (!reports.length) return <Empty>No reports. All quiet.</Empty>;
  return (
    <ul className="mt-6 divide-y border-y">
      {reports.map((r) => {
        const t = findTarget(db, r.targetType, r.targetId);
        const reporter = db.users.find((u) => u.id === r.reporterId);
        return (
          <li key={r.id} className={cn("py-4", r.status === "resolved" && "opacity-60")}>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{r.targetType} · reported by @{reporter?.username ?? "unknown"} · {format(new Date(r.createdAt), "PP")}</p>
            <p className="mt-1 text-sm">Reason: {r.reason}</p>
            <blockquote className="mt-2 border-l-2 pl-3 text-sm text-muted-foreground">{t ? t.text.slice(0, 280) : "Content was deleted."}</blockquote>
            <div className="mt-3 flex flex-wrap gap-2">
              {t && (t.removed
                ? <Button size="sm" variant="outline" onClick={() => attempt(() => moderateContent(r.targetType, r.targetId, false), "Restored")}>Restore content</Button>
                : <Button size="sm" variant="destructive" onClick={() => attempt(() => moderateContent(r.targetType, r.targetId, true), "Removed")}>Remove content</Button>)}
              {r.status === "open" && <Button size="sm" variant="ghost" onClick={() => attempt(() => resolveReport(r.id))}>Mark resolved</Button>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Users() {
  const db = useDB();
  return (
    <ul className="mt-6 divide-y border-y">
      {db.users.map((u) => (
        <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{u.displayName} <span className="text-sm text-muted-foreground">@{u.username}</span></p>
            <p className="text-xs text-muted-foreground">{u.email} · {u.role} · {u.status}</p>
          </div>
          {u.role !== "admin" && (
            <div className="flex gap-1">
              {u.status !== "active" && <Button size="sm" variant="outline" onClick={() => attempt(() => setUserStatus(u.id, "active"))}>Restore</Button>}
              {u.status !== "suspended" && <Button size="sm" variant="ghost" onClick={() => attempt(() => setUserStatus(u.id, "suspended"))}>Suspend</Button>}
              {u.status !== "banned" && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => window.confirm(`Ban @${u.username}?`) && attempt(() => setUserStatus(u.id, "banned"))}>Ban</Button>}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function History() {
  const db = useDB();
  if (!db.modActions.length) return <Empty>No moderation history yet.</Empty>;
  return (
    <ul className="mt-6 divide-y border-y text-sm">
      {db.modActions.map((a) => (
        <li key={a.id} className="flex gap-3 py-3">
          <span className="w-32 shrink-0 text-muted-foreground">{format(new Date(a.createdAt), "PP p")}</span>
          <span><span className="font-medium">@{db.users.find((u) => u.id === a.adminId)?.username}</span> {a.action} {a.targetType} {a.note ? `“${a.note}”` : a.targetId.slice(0, 8)}</span>
        </li>
      ))}
    </ul>
  );
}
