import { useSyncExternalStore } from "react";
import { createSeed } from "./seed";
import type { DB, Kind, PostCategory, ReplyTarget, TargetType, Title, User } from "./types";

/*
 * Local data layer. A single in-memory DB persisted to localStorage.
 * Every write goes through an action here so it can later be replaced by
 * real API calls without touching components.
 */

const KEY = "inktella:db:v1";
const serverState: DB = createSeed();
let state: DB = serverState;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function hydrateStore() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed.version === 1) {
        state = parsed;
        emit();
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable */
  }
}

function mutate(fn: (db: DB) => void) {
  const next = structuredClone(state);
  fn(next);
  state = next;
  persist();
  emit();
}

export function getDB() {
  return state;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, () => state, () => serverState);
}

export function useCurrentUser(): User | null {
  const db = useDB();
  return db.users.find((u) => u.id === db.sessionUserId) ?? null;
}

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/* ---------------- auth ---------------- */

export function signIn(email: string, password: string): User {
  const u = state.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u || u.password !== password) throw new Error("That email and password don't match.");
  if (u.status === "banned") throw new Error("This account has been banned.");
  mutate((db) => {
    db.sessionUserId = u.id;
  });
  return u;
}

export function signUp(input: { email: string; password: string; displayName: string; username: string }): User {
  const email = input.email.trim().toLowerCase();
  const username = slugify(input.username).replace(/-/g, "_");
  if (state.users.some((u) => u.email.toLowerCase() === email)) throw new Error("An account with this email already exists.");
  if (!username) throw new Error("Please choose a username.");
  if (state.users.some((u) => u.username === username)) throw new Error("That username is taken.");
  const user: User = {
    id: uid(), email, password: input.password, displayName: input.displayName.trim() || username,
    username, role: "user", status: "active", createdAt: now(),
  };
  mutate((db) => {
    db.users.push(user);
    db.sessionUserId = user.id;
  });
  return user;
}

export function signOut() {
  mutate((db) => {
    db.sessionUserId = null;
  });
}

export function updateProfile(userId: string, p: { displayName: string; username: string; bio?: string }) {
  const username = slugify(p.username).replace(/-/g, "_");
  if (!username) throw new Error("Username can't be empty.");
  if (state.users.some((u) => u.username === username && u.id !== userId)) throw new Error("That username is taken.");
  mutate((db) => {
    const u = db.users.find((x) => x.id === userId)!;
    u.displayName = p.displayName.trim() || username;
    u.username = username;
    u.bio = p.bio?.trim() || undefined;
  });
}

export function deleteAccount(userId: string) {
  mutate((db) => {
    db.users = db.users.filter((u) => u.id !== userId);
    db.posts = db.posts.filter((x) => x.userId !== userId);
    db.reviews = db.reviews.filter((x) => x.userId !== userId);
    db.questions = db.questions.filter((x) => x.userId !== userId);
    db.answers = db.answers.filter((x) => x.userId !== userId);
    db.replies = db.replies.filter((x) => x.userId !== userId);
    db.likes = db.likes.filter((x) => x.userId !== userId);
    db.collections = db.collections.filter((x) => x.userId !== userId);
    db.savedCollections = db.savedCollections.filter((x) => x.userId !== userId);
    db.library = db.library.filter((x) => x.userId !== userId);
    db.sessionUserId = null;
  });
}

function me(): User {
  const u = state.users.find((x) => x.id === state.sessionUserId);
  if (!u) throw new Error("Please sign in first.");
  if (u.status !== "active") throw new Error("Your account is restricted from posting right now.");
  return u;
}

function requireAdmin(): User {
  const u = me();
  if (u.role !== "admin") throw new Error("Admins only.");
  return u;
}

/* ---------------- contributions ---------------- */

const limits = { post: 500, quote: 300, review: 10000, answer: 5000, reply: 1000, question: 300, details: 2000 };

function clean(s: string | undefined, max: number, label = "Text") {
  const v = (s ?? "").trim();
  if (v.length > max) throw new Error(`${label} is too long (max ${max} characters).`);
  return v;
}

export function createPost(input: {
  titleId: string; category: PostCategory; body: string; spoiler: boolean;
  quoteCharacter?: string; quoteNote?: string; season?: number; episode?: number;
}) {
  const u = me();
  const max = input.category === "quote" ? limits.quote : limits.post;
  const body = clean(input.body, max);
  if (!body) throw new Error("Write something first.");
  const id = uid();
  mutate((db) => {
    db.posts.push({
      id, titleId: input.titleId, userId: u.id, category: input.category, body, spoiler: input.spoiler,
      quoteCharacter: clean(input.quoteCharacter, 80) || undefined,
      quoteNote: clean(input.quoteNote, limits.post) || undefined,
      season: input.season || undefined, episode: input.episode || undefined, createdAt: now(),
    });
  });
  return id;
}

export function editPost(id: string, body: string) {
  const u = me();
  mutate((db) => {
    const p = db.posts.find((x) => x.id === id);
    if (!p || p.userId !== u.id) throw new Error("Not allowed.");
    p.body = clean(body, p.category === "quote" ? limits.quote : limits.post);
    p.updatedAt = now();
  });
}

export function upsertReview(input: { titleId: string; heading?: string; body: string; spoiler: boolean }) {
  const u = me();
  const body = clean(input.body, limits.review, "Review");
  if (!body) throw new Error("Your review is empty.");
  const heading = clean(input.heading, 140, "Title") || undefined;
  let id = state.reviews.find((r) => r.titleId === input.titleId && r.userId === u.id && !r.removed)?.id;
  mutate((db) => {
    const existing = id ? db.reviews.find((r) => r.id === id) : undefined;
    if (existing) {
      Object.assign(existing, { heading, body, spoiler: input.spoiler, updatedAt: now() });
    } else {
      id = uid();
      db.reviews.push({ id, titleId: input.titleId, userId: u.id, heading, body, spoiler: input.spoiler, createdAt: now() });
    }
  });
  return id!;
}

export function createQuestion(input: { titleId: string; text: string; details?: string; spoiler: boolean; season?: number; episode?: number }) {
  const u = me();
  const text = clean(input.text, limits.question, "Question");
  if (!text) throw new Error("Write your question first.");
  const id = uid();
  mutate((db) => {
    db.questions.push({
      id, titleId: input.titleId, userId: u.id, text, details: clean(input.details, limits.details, "Details") || undefined,
      spoiler: input.spoiler, season: input.season || undefined, episode: input.episode || undefined, createdAt: now(),
    });
  });
  return id;
}

export function createAnswer(questionId: string, body: string, spoiler: boolean) {
  const u = me();
  const b = clean(body, limits.answer, "Answer");
  if (!b) throw new Error("Write your answer first.");
  mutate((db) => {
    db.answers.push({ id: uid(), questionId, userId: u.id, body: b, spoiler, helpful: false, createdAt: now() });
  });
}

export function editAnswer(id: string, body: string) {
  const u = me();
  mutate((db) => {
    const a = db.answers.find((x) => x.id === id);
    if (!a || a.userId !== u.id) throw new Error("Not allowed.");
    a.body = clean(body, limits.answer, "Answer");
    a.updatedAt = now();
  });
}

export function toggleHelpful(answerId: string) {
  const u = me();
  mutate((db) => {
    const a = db.answers.find((x) => x.id === answerId);
    const q = a && db.questions.find((x) => x.id === a.questionId);
    if (!a || !q || q.userId !== u.id) throw new Error("Only the person who asked can mark answers helpful.");
    a.helpful = !a.helpful;
  });
}

export function createReply(targetType: ReplyTarget, targetId: string, body: string, spoiler: boolean) {
  const u = me();
  const b = clean(body, limits.reply, "Reply");
  if (!b) throw new Error("Write your reply first.");
  mutate((db) => {
    db.replies.push({ id: uid(), targetType, targetId, userId: u.id, body: b, spoiler, createdAt: now() });
  });
}

type Owned = "post" | "review" | "question" | "answer" | "reply";
const table = (t: Owned) =>
  ({ post: "posts", review: "reviews", question: "questions", answer: "answers", reply: "replies" } as const)[t];

export function deleteOwn(type: Owned, id: string) {
  const u = me();
  mutate((db) => {
    const list = db[table(type)] as { id: string; userId: string }[];
    const item = list.find((x) => x.id === id);
    if (!item || (item.userId !== u.id && u.role !== "admin")) throw new Error("Not allowed.");
    (db[table(type)] as { id: string }[]) = list.filter((x) => x.id !== id);
    db.likes = db.likes.filter((l) => !(l.targetType === type && l.targetId === id));
  });
}

export function toggleLike(targetType: TargetType, targetId: string) {
  const u = me();
  mutate((db) => {
    const i = db.likes.findIndex((l) => l.userId === u.id && l.targetType === targetType && l.targetId === targetId);
    if (i >= 0) db.likes.splice(i, 1);
    else db.likes.push({ userId: u.id, targetType, targetId });
  });
}

export function report(targetType: TargetType, targetId: string, reason: string) {
  const u = me();
  if (state.reports.some((r) => r.reporterId === u.id && r.targetId === targetId && r.status === "open")) return;
  mutate((db) => {
    db.reports.push({ id: uid(), targetType, targetId, reporterId: u.id, reason: clean(reason, 300) || "No reason given", status: "open", createdAt: now() });
  });
}

/* ---------------- library & collections ---------------- */

export function setLibrary(titleId: string, s: "watched" | "want") {
  const u = me();
  mutate((db) => {
    const e = db.library.find((x) => x.userId === u.id && x.titleId === titleId);
    if (e && e.state === s) db.library = db.library.filter((x) => x !== e && !(x.userId === u.id && x.titleId === titleId));
    else if (e) Object.assign(e, { state: s, updatedAt: now() });
    else db.library.push({ userId: u.id, titleId, state: s, updatedAt: now() });
  });
}

export function createCollection(name: string, description?: string, titleIds: string[] = []) {
  const u = me();
  const n = clean(name, 100, "Name");
  if (!n) throw new Error("Give your collection a name.");
  let slug = slugify(n) || "collection";
  if (state.collections.some((c) => c.slug === slug)) slug = `${slug}-${uid().slice(0, 6)}`;
  const id = uid();
  mutate((db) => {
    db.collections.push({ id, slug, userId: u.id, name: n, description: clean(description, 500) || undefined, titleIds, createdAt: now(), updatedAt: now() });
  });
  return slug;
}

function ownCollection(db: DB, id: string) {
  const u = me();
  const c = db.collections.find((x) => x.id === id);
  if (!c || c.userId !== u.id) throw new Error("Not allowed.");
  c.updatedAt = now();
  return c;
}

export function updateCollection(id: string, p: { name: string; description?: string }) {
  mutate((db) => {
    const c = ownCollection(db, id);
    c.name = clean(p.name, 100, "Name") || c.name;
    c.description = clean(p.description, 500) || undefined;
  });
}

export function toggleInCollection(id: string, titleId: string) {
  mutate((db) => {
    const c = ownCollection(db, id);
    c.titleIds = c.titleIds.includes(titleId) ? c.titleIds.filter((x) => x !== titleId) : [...c.titleIds, titleId];
  });
}

export function moveInCollection(id: string, index: number, dir: -1 | 1) {
  mutate((db) => {
    const c = ownCollection(db, id);
    const j = index + dir;
    if (j < 0 || j >= c.titleIds.length) return;
    [c.titleIds[index], c.titleIds[j]] = [c.titleIds[j], c.titleIds[index]];
  });
}

export function deleteCollection(id: string) {
  mutate((db) => {
    ownCollection(db, id);
    db.collections = db.collections.filter((c) => c.id !== id);
    db.savedCollections = db.savedCollections.filter((s) => s.collectionId !== id);
  });
}

export function toggleSaveCollection(collectionId: string) {
  const u = me();
  mutate((db) => {
    const i = db.savedCollections.findIndex((s) => s.userId === u.id && s.collectionId === collectionId);
    if (i >= 0) db.savedCollections.splice(i, 1);
    else db.savedCollections.push({ userId: u.id, collectionId });
  });
}

/* ---------------- admin ---------------- */

function log(db: DB, adminId: string, action: string, targetType: string, targetId: string, note?: string) {
  db.modActions.unshift({ id: uid(), adminId, action, targetType, targetId, note, createdAt: now() });
}

export function findDuplicate(name: string, year: number, exceptId?: string) {
  const n = slugify(name);
  return state.titles.find((t) => t.id !== exceptId && t.year === year && (slugify(t.name) === n || t.altNames.some((a) => slugify(a) === n)));
}

export type TitleInput = Omit<Title, "id" | "createdAt">;

export function saveTitle(input: TitleInput, id?: string) {
  const a = requireAdmin();
  const slug = slugify(input.slug || `${input.name}-${input.year}`);
  if (!input.name.trim()) throw new Error("Title name is required.");
  if (state.titles.some((t) => t.slug === slug && t.id !== id)) throw new Error("That URL slug is already used.");
  const newId = id ?? uid();
  mutate((db) => {
    const existing = db.titles.find((t) => t.id === id);
    if (existing) {
      if (existing.slug !== slug) {
        db.slugRedirects[existing.slug] = slug;
        for (const k of Object.keys(db.slugRedirects)) if (db.slugRedirects[k] === existing.slug) db.slugRedirects[k] = slug;
      }
      Object.assign(existing, input, { slug });
      log(db, a.id, "title.update", "title", existing.id, existing.name);
    } else {
      db.titles.push({ ...input, slug, id: newId, createdAt: now() });
      log(db, a.id, "title.create", "title", newId, input.name);
    }
  });
  return slug;
}

export function setTitleStatus(id: string, status: Title["status"]) {
  const a = requireAdmin();
  mutate((db) => {
    const t = db.titles.find((x) => x.id === id);
    if (!t) return;
    t.status = status;
    log(db, a.id, `title.${status}`, "title", id, t.name);
  });
}

export function moderateContent(targetType: TargetType, targetId: string, removed: boolean) {
  const a = requireAdmin();
  mutate((db) => {
    const list = db[table(targetType)] as { id: string; removed?: boolean }[];
    const item = list.find((x) => x.id === targetId);
    if (!item) return;
    item.removed = removed;
    log(db, a.id, removed ? "content.remove" : "content.restore", targetType, targetId);
  });
}

export function resolveReport(id: string) {
  const a = requireAdmin();
  mutate((db) => {
    const r = db.reports.find((x) => x.id === id);
    if (!r) return;
    r.status = "resolved";
    log(db, a.id, "report.resolve", "report", id);
  });
}

export function setUserStatus(userId: string, status: User["status"]) {
  const a = requireAdmin();
  if (userId === a.id) throw new Error("You can't change your own status.");
  mutate((db) => {
    const u = db.users.find((x) => x.id === userId);
    if (!u) return;
    u.status = status;
    log(db, a.id, `user.${status}`, "user", userId, u.username);
  });
}

/* ---------------- selectors ---------------- */

export const titlePath = (t: Pick<Title, "kind">): "/movie/$slug" | "/series/$slug" =>
  t.kind === "movie" ? "/movie/$slug" : "/series/$slug";

export const kindWord = (k: Kind) => (k === "movie" ? "movie" : "series");

export function likeInfo(db: DB, type: TargetType, id: string, userId?: string | null) {
  let count = 0;
  let liked = false;
  for (const l of db.likes) {
    if (l.targetType === type && l.targetId === id) {
      count++;
      if (l.userId === userId) liked = true;
    }
  }
  return { count, liked };
}
