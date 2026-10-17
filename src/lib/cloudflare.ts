import { createSeed } from "./seed";
import type { DB, User } from "./types";

export interface D1Database {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      run(): Promise<unknown>;
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

const emptyState = () => createSeed();

export async function readState(db: D1Database): Promise<DB> {
  const row = await db
    .prepare("SELECT payload FROM app_state WHERE id = 1")
    .bind()
    .first<{ payload: string }>();
  if (!row?.payload) {
    const seed = emptyState();
    await writeState(db, seed);
    return seed;
  }
  try {
    const parsed = JSON.parse(row.payload) as DB;
    if (parsed.version !== 1 || parsed.titles.length === 0) {
      const seed = emptyState();
      await writeState(db, seed);
      return seed;
    }
    return parsed;
  } catch {
    return emptyState();
  }
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
  const id = existing?.id ?? crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO users (id, clerk_id, username, email, display_name, created_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(clerk_id) DO UPDATE SET email=excluded.email, display_name=excluded.display_name, username=excluded.username`,
    )
    .bind(id, clerkId, input.username, input.email, input.displayName)
    .run();
  return id;
}

export function clerkUserId(request: Request) {
  return request.headers.get("x-clerk-user-id") ?? request.headers.get("x-user-id");
}
