import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search as SearchIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { titlePath, useDB } from "@/lib/store";
import { searchTitles } from "@/lib/search";
import { Poster } from "./bits";

export function useDebounced<T>(v: T, ms = 150) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

/** Instant-suggestion combobox with keyboard navigation. */
export function SearchBox({ initial = "", autoFocus, className, onSubmit }: { initial?: string; autoFocus?: boolean; className?: string; onSubmit?: (q: string) => void }) {
  const db = useDB();
  const navigate = useNavigate();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const dq = useDebounced(q);
  const listId = useId();
  const ref = useRef<HTMLDivElement>(null);

  const results = useMemo(() => (dq.trim().length >= 2 ? searchTitles(db.titles, dq, 7) : []), [db.titles, dq]);

  useEffect(() => setActive(-1), [dq]);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const go = (i: number) => {
    const t = results[i];
    setOpen(false);
    if (t) navigate({ to: titlePath(t), params: { slug: t.slug } });
    else if (q.trim()) {
      if (onSubmit) onSubmit(q.trim());
      else navigate({ to: "/search", search: { q: q.trim(), type: "all" } });
    }
  };

  const showList = open && dq.trim().length >= 2;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="flex items-center gap-2 rounded-full border bg-card px-3.5 focus-within:ring-1 focus-within:ring-ring">
        <SearchIcon className="size-4 shrink-0 text-subtle" />
        <input
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-label="Search movies and series"
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
            else if (e.key === "Enter") { e.preventDefault(); go(active); }
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search movies, series, people…"
          className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-subtle"
        />
        {q && (
          <button aria-label="Clear search" onClick={() => { setQ(""); setOpen(false); }} className="text-subtle hover:text-foreground">
            <X className="size-4" />
          </button>
        )}
      </div>
      {showList && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border bg-popover py-1 shadow-lg">
          {results.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">No titles found for “{dq}”. Try a shorter or different spelling.</li>}
          {results.map((t, i) => (
            <li
              key={t.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); go(i); }}
              className={cn("flex cursor-pointer items-center gap-3 px-3 py-2", i === active && "bg-accent")}
            >
              <Poster title={t} size="xs" className="w-8 rounded-sm p-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.year} · {t.kind === "movie" ? "Movie" : "Series"}</p>
              </div>
            </li>
          ))}
          {q.trim() && (
            <li role="option" aria-selected={false} onMouseDown={(e) => { e.preventDefault(); go(-1); }} className="cursor-pointer border-t px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
              See all results for “{q.trim()}”
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
