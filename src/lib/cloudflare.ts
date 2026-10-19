import { createSeed } from "./seed";
import type {
  Answer,
  Collection,
  DB,
  Like,
  Post,
  Question,
  RecommendVote,
  Reply,
  Review,
  User,
} from "./types";

export interface D1Database {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      run(): Promise<unknown>;
      all?<T = unknown>(): Promise<{ results: T[] }>;
    };
  };
}

export interface R2Bucket {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
    options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> },
  ): Promise<unknown>;
  get(key: string): Promise<{
    body: ReadableStream;
    httpMetadata?: { contentType?: string };
    httpEtag?: string;
  } | null>;
  delete(key: string): Promise<void>;
}

export interface CloudflareEnv {
  DB?: D1Database;
  MEDIA?: R2Bucket;
  CLERK_SECRET_KEY?: string;
  CLERK_WEBHOOK_SIGNING_SECRET?: string;
  ELLA?: { run(model: string, input: Record<string, unknown>): Promise<unknown> };
}

/** Nitro passes bindings on the request; direct Wrangler calls pass them as arg 2. */
export function cloudflareEnv(request: Request, fallback?: unknown): CloudflareEnv {
  const runtime = (request as Request & { runtime?: { cloudflare?: { env?: CloudflareEnv } } }).runtime;
  return runtime?.cloudflare?.env ?? (fallback as CloudflareEnv | undefined) ?? {};
}

export async function readAccount(db: D1Database, id: string): Promise<User | null> {
  const row = await db.prepare(
    "SELECT id, clerk_id, username, email, display_name, role, status, is_pro, bio, avatar_key, created_at FROM users WHERE id = ?",
  ).bind(id).first<{
    id: string; clerk_id: string; username: string; email: string; display_name: string;
    role: User["role"]; status: User["status"]; is_pro: number; bio: string | null; avatar_key: string | null; created_at: string;
  }>();
  if (!row) return null;
  return {
    id: row.id, clerkId: row.clerk_id, username: row.username, email: row.email,
    displayName: row.display_name, role: row.role, status: row.status, isPro: Boolean(row.is_pro),
    bio: row.bio ?? undefined, avatarKey: row.avatar_key ?? undefined, createdAt: row.created_at, password: "",
  };
}

const emptyState = () => createSeed();

type AccountRow = {
  id: string; clerk_id: string | null; username: string; email: string; display_name: string;
  role: User["role"]; status: User["status"]; is_pro: number; bio: string | null; avatar_key: string | null; created_at: string;
};

/** Accounts live in the users table; merge them so every signed-up profile is visible. */
async function mergeAccounts(db: D1Database, state: DB): Promise<DB> {
  try {
    const stmt = db.prepare(
      "SELECT id, clerk_id, username, email, display_name, role, status, is_pro, bio, avatar_key, created_at FROM users",
    ).bind();
    if (!stmt.all) return state;
    const { results } = await stmt.all<AccountRow>();
    if (!results || results.length === 0) return state;
    const byId = new Map(state.users.map((u) => [u.id, u]));
    for (const row of results) {
      const prev = byId.get(row.id);
      byId.set(row.id, {
        ...(prev ?? {}),
        id: row.id, clerkId: row.clerk_id ?? undefined, username: row.username, email: row.email,
        displayName: row.display_name, role: row.role, status: row.status, isPro: Boolean(row.is_pro),
        bio: row.bio ?? prev?.bio, avatarKey: row.avatar_key ?? prev?.avatarKey, createdAt: row.created_at, password: "",
      } as User);
    }
    return { ...state, users: [...byId.values()], sessionUserId: null };
  } catch {
    return state;
  }
}

/** Merges normalized D1 rows into the app state if content tables are populated. */
async function mergeContent(db: D1Database, state: DB): Promise<DB> {
  const merged = { ...state };

  // 1. Posts from D1
  try {
    const stmt = db.prepare(
      "SELECT id, title_id, user_id, category, body, quote_character, quote_note, spoiler, season, episode, created_at, updated_at, removed FROM posts",
    ).bind();
    if (stmt.all) {
      const { results } = await stmt.all<{
        id: string; title_id: string; user_id: string; category: Post["category"];
        body: string; quote_character: string | null; quote_note: string | null;
        spoiler: number; season: number | null; episode: number | null;
        created_at: string; updated_at: string | null; removed: number;
      }>();
      if (results && results.length > 0) {
        const postsMap = new Map(merged.posts.map((p) => [p.id, p]));
        for (const r of results) {
          postsMap.set(r.id, {
            id: r.id,
            titleId: r.title_id,
            userId: r.user_id,
            category: r.category,
            body: r.body,
            quoteCharacter: r.quote_character ?? undefined,
            quoteNote: r.quote_note ?? undefined,
            spoiler: Boolean(r.spoiler),
            season: r.season ?? undefined,
            episode: r.episode ?? undefined,
            createdAt: r.created_at,
            updatedAt: r.updated_at ?? undefined,
            removed: Boolean(r.removed),
          });
        }
        merged.posts = [...postsMap.values()];
      }
    }
  } catch {}

  // 2. Reviews from D1
  try {
    const stmt = db.prepare(
      "SELECT id, title_id, user_id, heading, body, spoiler, created_at, updated_at, removed FROM reviews",
    ).bind();
    if (stmt.all) {
      const { results } = await stmt.all<{
        id: string; title_id: string; user_id: string; heading: string | null;
        body: string; spoiler: number; created_at: string; updated_at: string | null; removed: number;
      }>();
      if (results && results.length > 0) {
        const reviewsMap = new Map(merged.reviews.map((r) => [r.id, r]));
        for (const r of results) {
          reviewsMap.set(r.id, {
            id: r.id,
            titleId: r.title_id,
            userId: r.user_id,
            heading: r.heading ?? undefined,
            body: r.body,
            spoiler: Boolean(r.spoiler),
            createdAt: r.created_at,
            updatedAt: r.updated_at ?? undefined,
            removed: Boolean(r.removed),
          });
        }
        merged.reviews = [...reviewsMap.values()];
      }
    }
  } catch {}

  // 3. Questions from D1
  try {
    const stmt = db.prepare(
      "SELECT id, title_id, user_id, text, details, spoiler, season, episode, created_at, updated_at, removed FROM questions",
    ).bind();
    if (stmt.all) {
      const { results } = await stmt.all<{
        id: string; title_id: string; user_id: string; text: string; details: string | null;
        spoiler: number; season: number | null; episode: number | null;
        created_at: string; updated_at: string | null; removed: number;
      }>();
      if (results && results.length > 0) {
        const questionsMap = new Map(merged.questions.map((q) => [q.id, q]));
        for (const r of results) {
          questionsMap.set(r.id, {
            id: r.id,
            titleId: r.title_id,
            userId: r.user_id,
            text: r.text,
            details: r.details ?? undefined,
            spoiler: Boolean(r.spoiler),
            season: r.season ?? undefined,
            episode: r.episode ?? undefined,
            createdAt: r.created_at,
            updatedAt: r.updated_at ?? undefined,
            removed: Boolean(r.removed),
          });
        }
        merged.questions = [...questionsMap.values()];
      }
    }
  } catch {}

  // 4. Answers from D1
  try {
    const stmt = db.prepare(
      "SELECT id, question_id, user_id, body, spoiler, helpful, created_at, updated_at, removed FROM answers",
    ).bind();
    if (stmt.all) {
      const { results } = await stmt.all<{
        id: string; question_id: string; user_id: string; body: string;
        spoiler: number; helpful: number; created_at: string; updated_at: string | null; removed: number;
      }>();
      if (results && results.length > 0) {
        const answersMap = new Map(merged.answers.map((a) => [a.id, a]));
        for (const r of results) {
          answersMap.set(r.id, {
            id: r.id,
            questionId: r.question_id,
            userId: r.user_id,
            body: r.body,
            spoiler: Boolean(r.spoiler),
            helpful: Boolean(r.helpful),
            createdAt: r.created_at,
            updatedAt: r.updated_at ?? undefined,
            removed: Boolean(r.removed),
          });
        }
        merged.answers = [...answersMap.values()];
      }
    }
  } catch {}

  // 5. Replies from D1
  try {
    const stmt = db.prepare(
      "SELECT id, target_type, target_id, user_id, body, spoiler, created_at, removed FROM replies",
    ).bind();
    if (stmt.all) {
      const { results } = await stmt.all<{
        id: string; target_type: Reply["targetType"]; target_id: string; user_id: string;
        body: string; spoiler: number; created_at: string; removed: number;
      }>();
      if (results && results.length > 0) {
        const repliesMap = new Map(merged.replies.map((rp) => [rp.id, rp]));
        for (const r of results) {
          repliesMap.set(r.id, {
            id: r.id,
            targetType: r.target_type,
            targetId: r.target_id,
            userId: r.user_id,
            body: r.body,
            spoiler: Boolean(r.spoiler),
            createdAt: r.created_at,
            removed: Boolean(r.removed),
          });
        }
        merged.replies = [...repliesMap.values()];
      }
    }
  } catch {}

  // 6. Likes from D1
  try {
    const stmt = db.prepare("SELECT user_id, target_type, target_id FROM likes").bind();
    if (stmt.all) {
      const { results } = await stmt.all<{ user_id: string; target_type: Like["targetType"]; target_id: string }>();
      if (results && results.length > 0) {
        const likesSet = new Set(merged.likes.map((l) => `${l.userId}:${l.targetType}:${l.targetId}`));
        const outLikes = [...merged.likes];
        for (const r of results) {
          const key = `${r.user_id}:${r.target_type}:${r.target_id}`;
          if (!likesSet.has(key)) {
            likesSet.add(key);
            outLikes.push({ userId: r.user_id, targetType: r.target_type, targetId: r.target_id });
          }
        }
        merged.likes = outLikes;
      }
    }
  } catch {}

  // 7. Collections from D1
  try {
    const stmt = db.prepare(
      "SELECT id, slug, user_id, name, description, title_ids, created_at, updated_at FROM collections",
    ).bind();
    if (stmt.all) {
      const { results } = await stmt.all<{
        id: string; slug: string; user_id: string; name: string;
        description: string | null; title_ids: string; created_at: string; updated_at: string;
      }>();
      if (results && results.length > 0) {
        const collsMap = new Map(merged.collections.map((c) => [c.id, c]));
        for (const r of results) {
          let titleIds: string[] = [];
          try { titleIds = JSON.parse(r.title_ids); } catch {}
          collsMap.set(r.id, {
            id: r.id,
            slug: r.slug,
            userId: r.user_id,
            name: r.name,
            description: r.description ?? undefined,
            titleIds,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          });
        }
        merged.collections = [...collsMap.values()];
      }
    }
  } catch {}

  // 8. Saved Collections from D1
  try {
    const stmt = db.prepare("SELECT user_id, collection_id FROM saved_collections").bind();
    if (stmt.all) {
      const { results } = await stmt.all<{ user_id: string; collection_id: string }>();
      if (results && results.length > 0) {
        const set = new Set(merged.savedCollections.map((s) => `${s.userId}:${s.collectionId}`));
        const out = [...merged.savedCollections];
        for (const r of results) {
          const key = `${r.user_id}:${r.collection_id}`;
          if (!set.has(key)) {
            set.add(key);
            out.push({ userId: r.user_id, collectionId: r.collection_id });
          }
        }
        merged.savedCollections = out;
      }
    }
  } catch {}

  // 9. Library from D1
  try {
    const stmt = db.prepare("SELECT user_id, title_id, state, updated_at FROM library").bind();
    if (stmt.all) {
      const { results } = await stmt.all<{ user_id: string; title_id: string; state: "watched" | "want"; updated_at: string }>();
      if (results && results.length > 0) {
        const libMap = new Map(merged.library.map((l) => [`${l.userId}:${l.titleId}`, l]));
        for (const r of results) {
          libMap.set(`${r.user_id}:${r.title_id}`, {
            userId: r.user_id,
            titleId: r.title_id,
            state: r.state,
            updatedAt: r.updated_at,
          });
        }
        merged.library = [...libMap.values()];
      }
    }
  } catch {}

  // 10. Recommendations from D1
  try {
    const stmt = db.prepare("SELECT user_id, title_id, value, updated_at FROM recommendations").bind();
    if (stmt.all) {
      const { results } = await stmt.all<{ user_id: string; title_id: string; value: "yes" | "no"; updated_at: string }>();
      if (results && results.length > 0) {
        const recMap = new Map(merged.recommendations.map((rec) => [`${rec.userId}:${rec.titleId}`, rec]));
        for (const r of results) {
          recMap.set(`${r.user_id}:${r.title_id}`, {
            userId: r.user_id,
            titleId: r.title_id,
            value: r.value,
            updatedAt: r.updated_at,
          });
        }
        merged.recommendations = [...recMap.values()];
      }
    }
  } catch {}

  return merged;
}

/** Syncs content and posts to dedicated normalized Cloudflare D1 tables. */
async function syncContentToD1(db: D1Database, state: DB) {
  // Titles
  if (state.titles?.length) {
    for (const t of state.titles) {
      try {
        await db
          .prepare(
            `INSERT INTO titles (id, slug, kind, name, alt_names, year, genres, synopsis, runtime, country, language, trailer_url, people, status, hue, poster_key, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, kind=excluded.kind, name=excluded.name, alt_names=excluded.alt_names,
             year=excluded.year, genres=excluded.genres, synopsis=excluded.synopsis, runtime=excluded.runtime, country=excluded.country,
             language=excluded.language, trailer_url=excluded.trailer_url, people=excluded.people, status=excluded.status, hue=excluded.hue, poster_key=excluded.poster_key`,
          )
          .bind(
            t.id, t.slug, t.kind, t.name, JSON.stringify(t.altNames ?? []), t.year, JSON.stringify(t.genres ?? []),
            t.synopsis, t.runtime ?? null, t.country ?? null, t.language ?? null, t.trailerUrl ?? null,
            JSON.stringify(t.people ?? []), t.status, t.hue, t.posterKey ?? null, t.createdAt,
          )
          .run();
      } catch {}
    }
  }

  // Posts
  if (state.posts?.length) {
    for (const p of state.posts) {
      try {
        await db
          .prepare(
            `INSERT INTO posts (id, title_id, user_id, category, body, quote_character, quote_note, spoiler, season, episode, created_at, updated_at, removed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET title_id=excluded.title_id, user_id=excluded.user_id, category=excluded.category,
             body=excluded.body, quote_character=excluded.quote_character, quote_note=excluded.quote_note, spoiler=excluded.spoiler,
             season=excluded.season, episode=excluded.episode, updated_at=excluded.updated_at, removed=excluded.removed`,
          )
          .bind(
            p.id, p.titleId, p.userId, p.category, p.body, p.quoteCharacter ?? null, p.quoteNote ?? null,
            p.spoiler ? 1 : 0, p.season ?? null, p.episode ?? null, p.createdAt, p.updatedAt ?? null, p.removed ? 1 : 0,
          )
          .run();
      } catch {}
    }
  }

  // Reviews
  if (state.reviews?.length) {
    for (const r of state.reviews) {
      try {
        await db
          .prepare(
            `INSERT INTO reviews (id, title_id, user_id, heading, body, spoiler, created_at, updated_at, removed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET title_id=excluded.title_id, user_id=excluded.user_id, heading=excluded.heading,
             body=excluded.body, spoiler=excluded.spoiler, updated_at=excluded.updated_at, removed=excluded.removed`,
          )
          .bind(
            r.id, r.titleId, r.userId, r.heading ?? null, r.body, r.spoiler ? 1 : 0,
            r.createdAt, r.updatedAt ?? null, r.removed ? 1 : 0,
          )
          .run();
      } catch {}
    }
  }

  // Questions
  if (state.questions?.length) {
    for (const q of state.questions) {
      try {
        await db
          .prepare(
            `INSERT INTO questions (id, title_id, user_id, text, details, spoiler, season, episode, created_at, updated_at, removed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET title_id=excluded.title_id, user_id=excluded.user_id, text=excluded.text,
             details=excluded.details, spoiler=excluded.spoiler, season=excluded.season, episode=excluded.episode,
             updated_at=excluded.updated_at, removed=excluded.removed`,
          )
          .bind(
            q.id, q.titleId, q.userId, q.text, q.details ?? null, q.spoiler ? 1 : 0,
            q.season ?? null, q.episode ?? null, q.createdAt, q.updatedAt ?? null, q.removed ? 1 : 0,
          )
          .run();
      } catch {}
    }
  }

  // Answers
  if (state.answers?.length) {
    for (const a of state.answers) {
      try {
        await db
          .prepare(
            `INSERT INTO answers (id, question_id, user_id, body, spoiler, helpful, created_at, updated_at, removed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET question_id=excluded.question_id, user_id=excluded.user_id, body=excluded.body,
             spoiler=excluded.spoiler, helpful=excluded.helpful, updated_at=excluded.updated_at, removed=excluded.removed`,
          )
          .bind(
            a.id, a.questionId, a.userId, a.body, a.spoiler ? 1 : 0, a.helpful ? 1 : 0,
            a.createdAt, a.updatedAt ?? null, a.removed ? 1 : 0,
          )
          .run();
      } catch {}
    }
  }

  // Replies
  if (state.replies?.length) {
    for (const rp of state.replies) {
      try {
        await db
          .prepare(
            `INSERT INTO replies (id, target_type, target_id, user_id, body, spoiler, created_at, removed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET target_type=excluded.target_type, target_id=excluded.target_id,
             user_id=excluded.user_id, body=excluded.body, spoiler=excluded.spoiler, removed=excluded.removed`,
          )
          .bind(
            rp.id, rp.targetType, rp.targetId, rp.userId, rp.body, rp.spoiler ? 1 : 0,
            rp.createdAt, rp.removed ? 1 : 0,
          )
          .run();
      } catch {}
    }
  }

  // Likes
  if (state.likes?.length) {
    for (const l of state.likes) {
      try {
        await db
          .prepare(
            `INSERT INTO likes (user_id, target_type, target_id)
             VALUES (?, ?, ?)
             ON CONFLICT(user_id, target_type, target_id) DO NOTHING`,
          )
          .bind(l.userId, l.targetType, l.targetId)
          .run();
      } catch {}
    }
  }

  // Collections
  if (state.collections?.length) {
    for (const c of state.collections) {
      try {
        await db
          .prepare(
            `INSERT INTO collections (id, slug, user_id, name, description, title_ids, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, user_id=excluded.user_id, name=excluded.name,
             description=excluded.description, title_ids=excluded.title_ids, updated_at=excluded.updated_at`,
          )
          .bind(
            c.id, c.slug, c.userId, c.name, c.description ?? null,
            JSON.stringify(c.titleIds ?? []), c.createdAt, c.updatedAt,
          )
          .run();
      } catch {}
    }
  }

  // Saved Collections
  if (state.savedCollections?.length) {
    for (const sc of state.savedCollections) {
      try {
        await db
          .prepare(
            `INSERT INTO saved_collections (user_id, collection_id)
             VALUES (?, ?)
             ON CONFLICT(user_id, collection_id) DO NOTHING`,
          )
          .bind(sc.userId, sc.collectionId)
          .run();
      } catch {}
    }
  }

  // Library
  if (state.library?.length) {
    for (const lib of state.library) {
      try {
        await db
          .prepare(
            `INSERT INTO library (user_id, title_id, state, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(user_id, title_id) DO UPDATE SET state=excluded.state, updated_at=excluded.updated_at`,
          )
          .bind(lib.userId, lib.titleId, lib.state, lib.updatedAt)
          .run();
      } catch {}
    }
  }

  // Recommendations
  if (state.recommendations?.length) {
    for (const rec of state.recommendations) {
      try {
        await db
          .prepare(
            `INSERT INTO recommendations (user_id, title_id, value, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(user_id, title_id) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
          )
          .bind(rec.userId, rec.titleId, rec.value, rec.updatedAt)
          .run();
      } catch {}
    }
  }

  // Discovery Tags
  if (state.discoveryTags?.length) {
    for (const dt of state.discoveryTags) {
      try {
        await db
          .prepare(
            `INSERT INTO discovery_tags (id, name, slug, description, aliases, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name, slug=excluded.slug, description=excluded.description,
             aliases=excluded.aliases, updated_at=excluded.updated_at`,
          )
          .bind(
            dt.id, dt.name, dt.slug, dt.description ?? null,
            JSON.stringify(dt.aliases ?? []), dt.createdAt, dt.updatedAt,
          )
          .run();
      } catch {}
    }
  }

  // Title Discovery Tags
  if (state.titleDiscoveryTags?.length) {
    for (const tdt of state.titleDiscoveryTags) {
      try {
        await db
          .prepare(
            `INSERT INTO title_discovery_tags (title_id, tag_id, created_at)
             VALUES (?, ?, ?)
             ON CONFLICT(title_id, tag_id) DO NOTHING`,
          )
          .bind(tdt.titleId, tdt.tagId, tdt.createdAt)
          .run();
      } catch {}
    }
  }

  // Intent Links
  if (state.intentLinks?.length) {
    for (const il of state.intentLinks) {
      try {
        await db
          .prepare(
            `INSERT INTO intent_links (id, title_id, tag_id, selected_phrase, start_offset, end_offset, blurb_version, approval_status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET selected_phrase=excluded.selected_phrase, start_offset=excluded.start_offset,
             end_offset=excluded.end_offset, blurb_version=excluded.blurb_version, approval_status=excluded.approval_status,
             updated_at=excluded.updated_at`,
          )
          .bind(
            il.id, il.titleId, il.tagId, il.selectedPhrase, il.startOffset, il.endOffset,
            il.blurbVersion, il.approvalStatus, il.createdAt, il.updatedAt,
          )
          .run();
      } catch {}
    }
  }
}

export async function readState(db: D1Database): Promise<DB> {
  const row = await db
    .prepare("SELECT payload FROM app_state WHERE id = 1")
    .bind()
    .first<{ payload: string }>();
  let parsed: DB | null = null;
  try {
    parsed = row?.payload ? (JSON.parse(row.payload) as DB) : null;
  } catch {
    parsed = null;
  }
  if (!parsed || parsed.version !== 1 || parsed.titles.length === 0) {
    parsed = emptyState();
    await writeState(db, parsed);
  }
  const withAccounts = await mergeAccounts(db, parsed);
  return mergeContent(db, withAccounts);
}

export async function writeState(db: D1Database, state: DB) {
  await db
    .prepare(
      "UPDATE app_state SET version = ?, payload = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
    )
    .bind(state.version, JSON.stringify({ ...state, sessionUserId: null, users: state.users.map((u) => ({ ...u, password: "" })) }))
    .run();

  for (const user of state.users) {
    await db
      .prepare(
        `INSERT INTO users (id, clerk_id, username, email, display_name, role, status, is_pro, bio, avatar_key, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET clerk_id=COALESCE(excluded.clerk_id, users.clerk_id), username=excluded.username, email=excluded.email, display_name=excluded.display_name,
      role=excluded.role, status=excluded.status, is_pro=excluded.is_pro, bio=excluded.bio, avatar_key=excluded.avatar_key, created_at=excluded.created_at`,
      )
      .bind(
        user.id,
        user.clerkId ?? null,
        user.username,
        user.email,
        user.displayName,
        user.role,
        user.status,
        user.isPro ? 1 : 0,
      user.bio ?? null,
      user.avatarKey ?? null,
      user.createdAt,
      )
      .run();
  }

  await syncContentToD1(db, state);
}

export async function attachClerkUser(
  db: D1Database,
  clerkId: string,
  input: Pick<User, "email" | "displayName" | "username">,
) {
  const existing = await db
    .prepare("SELECT id FROM users WHERE clerk_id = ?")
    .bind(clerkId)
    .first<{ id: string }>();

  // A user may have been created by an earlier webhook before the first page
  // load. Reuse that row instead of failing on the unique email constraint.
  const byEmail = existing
    ? null
    : await db
        .prepare("SELECT id FROM users WHERE email = ?")
        .bind(input.email)
        .first<{ id: string }>();
  const id = existing?.id ?? byEmail?.id ?? crypto.randomUUID();

  // Usernames are unique in D1, while Clerk usernames can be changed or
  // absent. Keep the Clerk id as a deterministic fallback for collisions.
  let username = input.username;
  const usernameOwner = await db
    .prepare("SELECT id FROM users WHERE username = ? AND id != ?")
    .bind(username, id)
    .first<{ id: string }>();
  if (usernameOwner) username = `${input.username}-${clerkId.slice(-6)}`;

  if (existing || byEmail) {
    await db
      .prepare(
        `UPDATE users
         SET clerk_id = ?, email = ?, display_name = ?, username = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(clerkId, input.email, input.displayName, username, id)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO users (id, clerk_id, username, email, display_name, created_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      )
      .bind(id, clerkId, username, input.email, input.displayName)
      .run();
  }
  return id;
}
