import { createSeed } from "./seed";
import type { DB, User } from "./types";

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
}

/** Nitro passes bindings on the request; direct Wrangler calls pass them as arg 2. */
export function cloudflareEnv(request: Request, fallback?: unknown): CloudflareEnv {
  const runtime = (request as Request & { runtime?: { cloudflare?: { env?: CloudflareEnv } } }).runtime;
  return runtime?.cloudflare?.env ?? (fallback as CloudflareEnv | undefined) ?? {};
}

export async function readAccount(db: D1Database, id: string): Promise<User | null> {
  const row = await db.prepare(
    "SELECT id, clerk_id, username, email, display_name, role, status, is_pro, bio, created_at FROM users WHERE id = ?",
  ).bind(id).first<{
    id: string; clerk_id: string; username: string; email: string; display_name: string;
    role: User["role"]; status: User["status"]; is_pro: number; bio: string | null; created_at: string;
  }>();
  if (!row) return null;
  return {
    id: row.id, clerkId: row.clerk_id, username: row.username, email: row.email,
    displayName: row.display_name, role: row.role, status: row.status, isPro: Boolean(row.is_pro),
    bio: row.bio ?? undefined, createdAt: row.created_at, password: "",
  };
}

const emptyState = () => createSeed();

type AccountRow = {
  id: string; clerk_id: string | null; username: string; email: string; display_name: string;
  role: User["role"]; status: User["status"]; is_pro: number; bio: string | null; created_at: string;
};

/** Accounts live in the users table; merge them so every signed-up profile is visible. */
async function mergeAccounts(db: D1Database, state: DB): Promise<DB> {
  const stmt = db.prepare(
    "SELECT id, clerk_id, username, email, display_name, role, status, is_pro, bio, created_at FROM users",
  ).bind();
  if (!stmt.all) return state;
  const { results } = await stmt.all<AccountRow>();
  const byId = new Map(state.users.map((u) => [u.id, u]));
  for (const row of results) {
    const prev = byId.get(row.id);
    byId.set(row.id, {
      ...(prev ?? {}),
      id: row.id, clerkId: row.clerk_id ?? undefined, username: row.username, email: row.email,
      displayName: row.display_name, role: row.role, status: row.status, isPro: Boolean(row.is_pro),
      bio: row.bio ?? prev?.bio, createdAt: row.created_at, password: "",
    } as User);
  }
  return { ...state, users: [...byId.values()], sessionUserId: null };
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
  return mergeAccounts(db, parsed);
}

export async function writeState(db: D1Database, state: DB) {
  await db
    .prepare(
      "UPDATE app_state SET version = ?, payload = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
    )
    .bind(state.version, JSON.stringify(state))
    .run();
  for (const user of state.users) {
    await db
      .prepare(
        `INSERT INTO users (id, clerk_id, username, email, display_name, role, status, is_pro, bio, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET clerk_id=COALESCE(excluded.clerk_id, users.clerk_id), username=excluded.username, email=excluded.email, display_name=excluded.display_name,
      role=excluded.role, status=excluded.status, is_pro=excluded.is_pro, bio=excluded.bio`,
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
        user.createdAt,
      )
      .run();
  }
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

