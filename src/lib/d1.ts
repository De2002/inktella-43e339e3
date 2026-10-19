import { cloudflareEnv, type CloudflareEnv, type D1Database } from "./cloudflare";
import { createSeed } from "./seed";
import type {
  Answer,
  Collection,
  DB,
  LibraryEntry,
  Like,
  Post,
  Question,
  RecommendVote,
  Reply,
  Review,
  Title,
  User,
} from "./types";

export interface D1QueryResult<T = unknown> {
  results: T[];
  success: boolean;
  meta?: Record<string, unknown>;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

/**
 * Creates an in-memory D1 database emulator for local development and testing
 * when running outside of Cloudflare Workers with real bindings.
 */
export function createInMemoryD1(initialState?: DB): D1Database {
  let state = structuredClone(initialState ?? createSeed());

  return {
    prepare(query: string) {
      let boundValues: unknown[] = [];
      return {
        bind(...values: unknown[]) {
          boundValues = values;
          return {
            async first<T = unknown>(): Promise<T | null> {
              const q = query.trim().toUpperCase();
              if (q.includes("FROM APP_STATE")) {
                return { id: 1, version: state.version, payload: JSON.stringify(state) } as T;
              }
              if (q.includes("FROM USERS WHERE ID = ?")) {
                const u = state.users.find((user) => user.id === boundValues[0]);
                if (!u) return null;
                return {
                  id: u.id,
                  clerk_id: u.clerkId ?? null,
                  username: u.username,
                  email: u.email,
                  display_name: u.displayName,
                  role: u.role,
                  status: u.status,
                  is_pro: u.isPro ? 1 : 0,
                  bio: u.bio ?? null,
                  created_at: u.createdAt,
                } as T;
              }
              if (q.includes("FROM USERS WHERE CLERK_ID = ?")) {
                const u = state.users.find((user) => user.clerkId === boundValues[0]);
                if (!u) return null;
                return { id: u.id } as T;
              }
              if (q.includes("FROM USERS WHERE EMAIL = ?")) {
                const u = state.users.find((user) => user.email === boundValues[0]);
                if (!u) return null;
                return { id: u.id } as T;
              }
              if (q.includes("FROM TITLES WHERE SLUG = ?")) {
                const t = state.titles.find((title) => title.slug === boundValues[0]);
                return (t as T) ?? null;
              }
              if (q.includes("FROM POSTS")) {
                const p = state.posts.find((post) => !post.removed);
                if (!p) return null;
                return {
                  id: p.id,
                  title_id: p.titleId,
                  user_id: p.userId,
                  category: p.category,
                  body: p.body,
                  quote_character: p.quoteCharacter ?? null,
                  quote_note: p.quoteNote ?? null,
                  spoiler: p.spoiler ? 1 : 0,
                  season: p.season ?? null,
                  episode: p.episode ?? null,
                  created_at: p.createdAt,
                  updated_at: p.updatedAt ?? null,
                  removed: p.removed ? 1 : 0,
                } as T;
              }
              return null;
            },
            async all<T = unknown>(): Promise<{ results: T[] }> {
              const q = query.trim().toUpperCase();
              if (q.includes("FROM POSTS")) {
                let posts = state.posts.filter((p) => !p.removed);
                if (q.includes("TITLE_ID = ?") && boundValues[0]) {
                  posts = posts.filter((p) => p.titleId === boundValues[0]);
                }
                const results = posts.map((p) => ({
                  id: p.id,
                  title_id: p.titleId,
                  user_id: p.userId,
                  category: p.category,
                  body: p.body,
                  quote_character: p.quoteCharacter ?? null,
                  quote_note: p.quoteNote ?? null,
                  spoiler: p.spoiler ? 1 : 0,
                  season: p.season ?? null,
                  episode: p.episode ?? null,
                  created_at: p.createdAt,
                  updated_at: p.updatedAt ?? null,
                  removed: p.removed ? 1 : 0,
                })) as T[];
                return { results };
              }
              if (q.includes("FROM REVIEWS")) {
                let reviews = state.reviews.filter((r) => !r.removed);
                if (q.includes("TITLE_ID = ?") && boundValues[0]) {
                  reviews = reviews.filter((r) => r.titleId === boundValues[0]);
                }
                const results = reviews.map((r) => ({
                  id: r.id,
                  title_id: r.titleId,
                  user_id: r.userId,
                  heading: r.heading ?? null,
                  body: r.body,
                  spoiler: r.spoiler ? 1 : 0,
                  created_at: r.createdAt,
                  updated_at: r.updatedAt ?? null,
                  removed: r.removed ? 1 : 0,
                })) as T[];
                return { results };
              }
              if (q.includes("FROM QUESTIONS")) {
                let questions = state.questions.filter((qItem) => !qItem.removed);
                if (q.includes("TITLE_ID = ?") && boundValues[0]) {
                  questions = questions.filter((qItem) => qItem.titleId === boundValues[0]);
                }
                const results = questions.map((qItem) => ({
                  id: qItem.id,
                  title_id: qItem.titleId,
                  user_id: qItem.userId,
                  text: qItem.text,
                  details: qItem.details ?? null,
                  spoiler: qItem.spoiler ? 1 : 0,
                  season: qItem.season ?? null,
                  episode: qItem.episode ?? null,
                  created_at: qItem.createdAt,
                  updated_at: qItem.updatedAt ?? null,
                  removed: qItem.removed ? 1 : 0,
                })) as T[];
                return { results };
              }
              if (q.includes("FROM TITLES")) {
                return { results: state.titles as T[] };
              }
              if (q.includes("FROM COLLECTIONS")) {
                return { results: state.collections as T[] };
              }
              if (q.includes("FROM USERS")) {
                return {
                  results: state.users.map((u) => ({
                    id: u.id,
                    clerk_id: u.clerkId ?? null,
                    username: u.username,
                    email: u.email,
                    display_name: u.displayName,
                    role: u.role,
                    status: u.status,
                    is_pro: u.isPro ? 1 : 0,
                    bio: u.bio ?? null,
                    created_at: u.createdAt,
                  })) as T[],
                };
              }
              return { results: [] };
            },
            async run(): Promise<unknown> {
              const q = query.trim().toUpperCase();
              if (q.includes("UPDATE APP_STATE")) {
                try {
                  const payload = boundValues[1] as string;
                  state = JSON.parse(payload) as DB;
                } catch {}
              }
              return { success: true };
            },
          };
        },
      };
    },
  };
}

let devFallbackClient: D1Database | null = null;

/**
 * Initializes and retrieves the Cloudflare D1 client.
 * Follows AGENTS.md binding resolution: Nitro request.runtime.cloudflare.env first,
 * then direct Worker env, and finally a development in-memory fallback.
 */
export function getD1Client(target?: Request | CloudflareEnv | D1Database | unknown): D1Database {
  if (target && typeof target === "object" && "prepare" in target) {
    return target as D1Database;
  }

  if (target instanceof Request) {
    const env = cloudflareEnv(target);
    if (env.DB) return env.DB;
  } else if (target && typeof target === "object") {
    const env = target as CloudflareEnv;
    if (env.DB) return env.DB;
  }

  if (!devFallbackClient) {
    devFallbackClient = createInMemoryD1();
  }
  return devFallbackClient;
}

/**
 * Low-level query helper to run a SELECT statement on D1 and return typed results array.
 */
export async function d1Query<T = unknown>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const stmt = params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql).bind();
  if (stmt.all) {
    const { results } = await stmt.all<T>();
    return results ?? [];
  }
  const first = await stmt.first<T>();
  return first ? [first] : [];
}

/**
 * Query helper to run a SELECT statement expecting a single row.
 */
export async function d1QueryFirst<T = unknown>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const stmt = params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql).bind();
  return (await stmt.first<T>()) ?? null;
}

/**
 * Execute helper for INSERT, UPDATE, DELETE statements on D1.
 */
export async function d1Execute(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<unknown> {
  const stmt = params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql).bind();
  return stmt.run();
}

/**
 * High-level Post queries for D1
 */
export const d1Posts = {
  async list(db: D1Database, options: { titleId?: string; userId?: string; limit?: number } = {}) {
    let sql =
      "SELECT id, title_id, user_id, category, body, quote_character, quote_note, spoiler, season, episode, created_at, updated_at, removed FROM posts WHERE removed = 0";
    const params: unknown[] = [];
    if (options.titleId) {
      sql += " AND title_id = ?";
      params.push(options.titleId);
    }
    if (options.userId) {
      sql += " AND user_id = ?";
      params.push(options.userId);
    }
    sql += " ORDER BY created_at DESC";
    if (options.limit) {
      sql += " LIMIT ?";
      params.push(options.limit);
    }
    return d1Query<Post>(db, sql, params);
  },

  async insert(db: D1Database, post: Post) {
    const sql = `
      INSERT INTO posts (id, title_id, user_id, category, body, quote_character, quote_note, spoiler, season, episode, created_at, updated_at, removed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET title_id=excluded.title_id, user_id=excluded.user_id, category=excluded.category,
      body=excluded.body, quote_character=excluded.quote_character, quote_note=excluded.quote_note, spoiler=excluded.spoiler,
      season=excluded.season, episode=excluded.episode, updated_at=excluded.updated_at, removed=excluded.removed
    `;
    return d1Execute(db, sql, [
      post.id,
      post.titleId,
      post.userId,
      post.category,
      post.body,
      post.quoteCharacter ?? null,
      post.quoteNote ?? null,
      post.spoiler ? 1 : 0,
      post.season ?? null,
      post.episode ?? null,
      post.createdAt,
      post.updatedAt ?? null,
      post.removed ? 1 : 0,
    ]);
  },

  async markRemoved(db: D1Database, id: string) {
    return d1Execute(db, "UPDATE posts SET removed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
  },
};

/**
 * High-level Review queries for D1
 */
export const d1Reviews = {
  async list(db: D1Database, options: { titleId?: string; userId?: string; limit?: number } = {}) {
    let sql =
      "SELECT id, title_id, user_id, heading, body, spoiler, created_at, updated_at, removed FROM reviews WHERE removed = 0";
    const params: unknown[] = [];
    if (options.titleId) {
      sql += " AND title_id = ?";
      params.push(options.titleId);
    }
    if (options.userId) {
      sql += " AND user_id = ?";
      params.push(options.userId);
    }
    sql += " ORDER BY created_at DESC";
    if (options.limit) {
      sql += " LIMIT ?";
      params.push(options.limit);
    }
    return d1Query<Review>(db, sql, params);
  },

  async insert(db: D1Database, review: Review) {
    const sql = `
      INSERT INTO reviews (id, title_id, user_id, heading, body, spoiler, created_at, updated_at, removed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET title_id=excluded.title_id, user_id=excluded.user_id, heading=excluded.heading,
      body=excluded.body, spoiler=excluded.spoiler, updated_at=excluded.updated_at, removed=excluded.removed
    `;
    return d1Execute(db, sql, [
      review.id,
      review.titleId,
      review.userId,
      review.heading ?? null,
      review.body,
      review.spoiler ? 1 : 0,
      review.createdAt,
      review.updatedAt ?? null,
      review.removed ? 1 : 0,
    ]);
  },
};

/**
 * High-level Title queries for D1
 */
export const d1Titles = {
  async list(db: D1Database, options: { kind?: "movie" | "series"; limit?: number } = {}) {
    let sql =
      "SELECT id, slug, kind, name, alt_names, year, genres, synopsis, runtime, country, language, trailer_url, people, status, hue, created_at FROM titles WHERE status = 'published'";
    const params: unknown[] = [];
    if (options.kind) {
      sql += " AND kind = ?";
      params.push(options.kind);
    }
    sql += " ORDER BY year DESC";
    if (options.limit) {
      sql += " LIMIT ?";
      params.push(options.limit);
    }
    return d1Query<Title>(db, sql, params);
  },

  async getBySlug(db: D1Database, slug: string) {
    return d1QueryFirst<Title>(
      db,
      "SELECT id, slug, kind, name, alt_names, year, genres, synopsis, runtime, country, language, trailer_url, people, status, hue, created_at FROM titles WHERE slug = ?",
      [slug],
    );
  },
};

/**
 * High-level Question & Answer queries for D1
 */
export const d1Discussions = {
  async listQuestions(db: D1Database, titleId?: string) {
    const sql = titleId
      ? "SELECT id, title_id, user_id, text, details, spoiler, season, episode, created_at, updated_at, removed FROM questions WHERE removed = 0 AND title_id = ? ORDER BY created_at DESC"
      : "SELECT id, title_id, user_id, text, details, spoiler, season, episode, created_at, updated_at, removed FROM questions WHERE removed = 0 ORDER BY created_at DESC";
    return d1Query<Question>(db, sql, titleId ? [titleId] : []);
  },

  async listAnswers(db: D1Database, questionId: string) {
    const sql =
      "SELECT id, question_id, user_id, body, spoiler, helpful, created_at, updated_at, removed FROM answers WHERE removed = 0 AND question_id = ? ORDER BY created_at ASC";
    return d1Query<Answer>(db, sql, [questionId]);
  },
};
