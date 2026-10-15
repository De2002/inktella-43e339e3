import type { Collection, Title } from "./types";

/*
 * Catalog search: normalized index with exact > prefix > word-prefix >
 * contains > token match > fuzzy (edit distance) ranking.
 * Mirrors the planned SQLite FTS5 + fuzzy fallback strategy.
 */

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lev(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

interface Indexed {
  names: string[];
  nameWords: string[];
  other: string[];
}

const cache = new WeakMap<Title, Indexed>();

function index(t: Title): Indexed {
  let ix = cache.get(t);
  if (!ix) {
    const names = [t.name, ...t.altNames].map(normalize).filter(Boolean);
    const stripped = names.map((n) => n.replace(/^the /, ""));
    const all = Array.from(new Set([...names, ...stripped]));
    ix = {
      names: all,
      nameWords: all.flatMap((n) => n.split(" ")),
      other: [String(t.year), t.kind, ...t.genres, ...t.people.map((p) => p.name)].map(normalize).flatMap((x) => x.split(" ")),
    };
    cache.set(t, ix);
  }
  return ix;
}

export function scoreTitle(t: Title, rawQuery: string) {
  const q = normalize(rawQuery);
  if (!q) return 0;
  const ix = index(t);
  if (ix.names.includes(q)) return 1000;
  if (ix.names.some((n) => n.startsWith(q))) return 800;
  if (ix.names.some((n) => n.includes(` ${q}`))) return 650;
  if (ix.names.some((n) => n.includes(q))) return 520;

  const tokens = q.split(" ");
  const words = [...ix.nameWords, ...ix.other];
  let score = 0;
  let matched = 0;
  for (const tok of tokens) {
    if (ix.nameWords.some((w) => w.startsWith(tok))) { score += 120; matched++; continue; }
    if (ix.other.some((w) => w.startsWith(tok))) { score += 80; matched++; continue; }
    if (tok.length >= 3) {
      const max = tok.length <= 5 ? 1 : 2;
      let best = max + 1;
      for (const w of words) {
        const cmp = w.length > tok.length + 1 ? w.slice(0, tok.length) : w;
        best = Math.min(best, lev(tok, cmp, max));
        if (best === 0) break;
      }
      if (best <= max) { score += 60 - best * 15; matched++; continue; }
    }
  }
  if (matched === 0) return 0;
  if (matched < tokens.length) return Math.round((score * matched) / tokens.length / 2);
  return score + 100;
}

export function searchTitles(titles: Title[], q: string, limit = 20) {
  return titles
    .filter((t) => t.status === "published")
    .map((t) => ({ t, s: scoreTitle(t, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.t.year - a.t.year)
    .slice(0, limit)
    .map((x) => x.t);
}

export function searchCollections(cols: Collection[], q: string, limit = 20) {
  const nq = normalize(q);
  if (!nq) return [];
  const toks = nq.split(" ");
  return cols
    .filter((c) => c.titleIds.length > 0)
    .map((c) => {
      const hay = normalize(`${c.name} ${c.description ?? ""}`);
      const words = hay.split(" ");
      let s = hay.includes(nq) ? 200 : 0;
      for (const t of toks) if (words.some((w) => w.startsWith(t) || (t.length > 3 && lev(t, w.slice(0, t.length), 1) <= 1))) s += 50;
      return { c, s: s >= toks.length * 50 ? s : 0 };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.c);
}
