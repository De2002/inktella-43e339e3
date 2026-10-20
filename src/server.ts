import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { readState, writeState, cloudflareEnv, type CloudflareEnv } from "./lib/cloudflare";
import { d1Posts, d1Reviews, d1Titles, d1Discussions, d1Query } from "./lib/d1";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { verifyWebhook } from "@clerk/backend/webhooks";
import { mediaKey } from "./lib/media";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

export async function handleCloudflareApi(request: Request, env: CloudflareEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;
  const json = (data: unknown, status = 200) => Response.json(data, { status });

  if ((url.pathname === "/api/webhooks/clerk" || url.pathname === "/api/public/webhooks/clerk") && request.method === "POST") {
    if (!env.DB) return json({ error: "Cloudflare D1 binding DB is missing" }, 503);
    if (!env.CLERK_WEBHOOK_SIGNING_SECRET) return json({ error: "Webhook is not configured" }, 503);
    let event;
    try {
      event = await verifyWebhook(request, { signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET });
    } catch {
      return json({ error: "Invalid webhook signature" }, 400);
    }
    const { attachClerkUser } = await import("./lib/cloudflare");
    if (event.type === "user.created" || event.type === "user.updated") {
      const email = event.data.email_addresses.find((address) => address.id === event.data.primary_email_address_id && address.verification?.status === "verified")?.email_address;
      if (email) {
        await attachClerkUser(env.DB, event.data.id, {
          email,
          displayName: `${event.data.first_name ?? ""} ${event.data.last_name ?? ""}`.trim() || "Inktella member",
          username: event.data.username ?? event.data.id.slice(-12),
        });
      }
    }
    return json({ ok: true });
  }

  /** Verifies the Clerk session token server-side; returns the Clerk user id or an error response. */
  const verifyCaller = async (): Promise<string | Response> => {
    if (!env.CLERK_SECRET_KEY) return json({ error: "Sign-in is not configured: CLERK_SECRET_KEY is missing from this Worker." }, 503);
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) return json({ error: "Authentication required" }, 401);
    try {
      const claims = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY, authorizedParties: [url.origin] });
      return claims.sub;
    } catch {
      return json({ error: "Your session expired. Please sign in again." }, 401);
    }
  };

  if (url.pathname === "/api/db") {
    if (!env.DB) return json({ error: "Cloudflare D1 binding DB is missing from this Worker." }, 503);
    try {
      if (request.method === "GET") return json(await readState(env.DB));
      if (request.method === "PUT") {
        const caller = await verifyCaller();
        if (caller instanceof Response) return caller;
        await writeState(env.DB, (await request.json()) as import("./lib/types").DB);
        return json({ ok: true });
      }
    } catch (error) {
      console.error("[api/db] PUT failed", {
        method: request.method,
        pathname: url.pathname,
        error,
      });
      return json({ error: "Database write failed. Check the Worker logs for the original exception." }, 503);
    }
  }

  if (url.pathname === "/api/auth/sync" && request.method === "POST") {
    if (!env.DB) return json({ error: "Your account cannot connect: Cloudflare D1 binding DB is missing." }, 503);
    const caller = await verifyCaller();
    if (caller instanceof Response) return caller;
    const clerkId = caller;
    // Identity comes from Clerk, never from a browser-supplied email or name.
    const { attachClerkUser, readAccount } = await import("./lib/cloudflare");
    try {
      const profile = await createClerkClient({ secretKey: env.CLERK_SECRET_KEY }).users.getUser(clerkId);
      const email = profile.emailAddresses.find((address) => address.id === profile.primaryEmailAddressId && address.verification?.status === "verified")?.emailAddress;
      if (!email) return json({ error: "Please verify your primary email address in Clerk before continuing." }, 422);
      const id = await attachClerkUser(env.DB, clerkId, {
        email,
        displayName: `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || profile.username || "Inktella member",
        username: profile.username ?? profile.id.slice(-12),
      });
      const account = await readAccount(env.DB, id);
      if (!account) throw new Error("Synced account row missing");
      if (account.status !== "active") return json({ error: "This account is not active." }, 403);
      return json({ id, user: account });
    } catch (error) {
      console.error("[auth/sync] Clerk or D1 account sync failed", error instanceof Error ? error.name : "UnknownError");
      return json({ error: "Account syncing failed. Check the Worker's Clerk key and apply the D1 migrations." }, 503);
    }
  }

  if (url.pathname === "/api/posts" && request.method === "GET") {
    if (!env.DB) return json({ error: "Cloudflare D1 binding DB is missing from this Worker." }, 503);
    const titleId = url.searchParams.get("titleId") ?? undefined;
    try {
      const results = await d1Posts.list(env.DB, { titleId });
      return json(results);
    } catch {
      return json({ error: "Failed to query posts from D1" }, 500);
    }
  }

  if (url.pathname === "/api/reviews" && request.method === "GET") {
    if (!env.DB) return json({ error: "Cloudflare D1 binding DB is missing from this Worker." }, 503);
    const titleId = url.searchParams.get("titleId") ?? undefined;
    try {
      const results = await d1Reviews.list(env.DB, { titleId });
      return json(results);
    } catch {
      return json({ error: "Failed to query reviews from D1" }, 500);
    }
  }

  if (url.pathname === "/api/titles" && request.method === "GET") {
    if (!env.DB) return json({ error: "Cloudflare D1 binding DB is missing from this Worker." }, 503);
    try {
      const results = await d1Titles.list(env.DB);
      return json(results);
    } catch {
      return json({ error: "Failed to query titles from D1" }, 500);
    }
  }

  if (url.pathname === "/api/questions" && request.method === "GET") {
    if (!env.DB) return json({ error: "Cloudflare D1 binding DB is missing from this Worker." }, 503);
    const titleId = url.searchParams.get("titleId") ?? undefined;
    try {
      const results = await d1Discussions.listQuestions(env.DB, titleId);
      return json(results);
    } catch {
      return json({ error: "Failed to query questions from D1" }, 500);
    }
  }

  if (url.pathname === "/api/collections" && request.method === "GET") {
    if (!env.DB) return json({ error: "Cloudflare D1 binding DB is missing from this Worker." }, 503);
    try {
      const results = await d1Query(
        env.DB,
        "SELECT id, slug, user_id, name, description, title_ids, created_at, updated_at FROM collections ORDER BY updated_at DESC",
      );
      return json(results);
    } catch {
      return json({ error: "Failed to query collections from D1" }, 500);
    }
  }

  const mediaMatch = url.pathname.match(/^\/api\/media\/(.+)$/);
  if (mediaMatch && env.MEDIA) {
    const key = decodeURIComponent(mediaMatch[1]);
    if (request.method === "GET") {
      const object = await env.MEDIA.get(key);
      if (!object) return new Response("Not found", { status: 404 });
      return new Response(object.body, {
        headers: {
          "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
          ...(object.httpEtag ? { etag: object.httpEtag } : {}),
        },
      });
    }
    if (request.method === "DELETE") {
      await env.MEDIA.delete(key);
      return json({ ok: true });
    }
  }

  if (url.pathname === "/api/ella/personality" && request.method === "POST") {
    const caller = await verifyCaller();
    if (caller instanceof Response) return caller;
    if (!env.DB || !env.ELLA) return json({ error: "Ella is unavailable" }, 503);
    const state = await readState(env.DB);
    const user = state.users.find((item) => item.clerkId === caller);
    if (!user) return json({ error: "Profile not found" }, 404);
    const favorites = (user.favoriteTitleIds ?? []).map((id) => state.titles.find((title) => title.id === id)?.name).filter(Boolean);
    const watched = state.library.filter((item) => item.userId === user.id && item.state === "watched");
    const collections = state.collections.filter((item) => item.userId === user.id);
    if (favorites.length + watched.length + collections.length < 3) return json({ error: "Ella needs a little more profile activity before she can make the call." }, 422);
    const trail = state.trail.filter((item) => item.userId === user.id).slice(-12).map((item) => state.titles.find((title) => title.id === item.titleId)?.name).filter(Boolean);
    const recommended = state.recommendations.filter((item) => item.userId === user.id).map((item) => state.titles.find((title) => title.id === item.titleId)?.name).filter(Boolean).slice(0, 12);
    const result = await env.ELLA.run("@cf/meta/llama-3.1-8b-instruct", { messages: [{ role: "system", content: "You are Ella, Inktella's warm and creative cinephile personality guide. Write one unique, positive, vivid third-person description in 2-3 sentences. Never criticize, diagnose, stereotype, or mention missing data. Call the person a cinephile." }, { role: "user", content: JSON.stringify({ name: user.displayName, favouriteFilms: favorites, recommendedFilms: recommended, viewingTrail: trail }) }] });
    const text = typeof result === "object" && result !== null && "response" in result ? String((result as { response?: unknown }).response ?? "") : String(result ?? "");
    return json({ description: text.trim() }, 200);
  }

  if (url.pathname === "/api/media" && env.MEDIA && request.method === "POST") {
    const caller = await verifyCaller();
    if (caller instanceof Response) return caller;
    if (!env.DB) return json({ error: "Database binding is missing" }, 503);
    const account = await env.DB.prepare("SELECT role, status FROM users WHERE clerk_id = ?").bind(caller).first<{ role: string; status: string }>();
    const form = await request.formData();
    const purpose = form.get("purpose");
    if (purpose === "poster" && account?.role !== "admin") return json({ error: "Only administrators can upload posters" }, 403);
    if (!account || account.status !== "active") return json({ error: "Active account required" }, 403);
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "A file is required" }, 400);
    if (file.size > 25 * 1024 * 1024) return json({ error: "Files must be 25MB or smaller" }, 413);
    const key = mediaKey(file.name);
    await env.MEDIA.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });
    return json({ key, url: `/api/media/${encodeURIComponent(key)}` }, 201);
  }

  return json({ error: "Not found" }, 404);
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const apiResponse = await handleCloudflareApi(request, cloudflareEnv(request, env));
      if (apiResponse) return apiResponse;
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
