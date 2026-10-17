import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { readState, writeState, type CloudflareEnv } from "./lib/cloudflare";
import { verifyToken } from "@clerk/backend";
import { verifyWebhook } from "@clerk/backend/webhooks";
import { mediaKey } from "./lib/media";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

async function handleCloudflareApi(request: Request, env: CloudflareEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;
  const json = (data: unknown, status = 200) => Response.json(data, { status });

  if (url.pathname === "/api/webhooks/clerk" && env.DB && request.method === "POST") {
    if (!env.CLERK_WEBHOOK_SIGNING_SECRET) return json({ error: "Webhook is not configured" }, 503);
    let event;
    try {
      event = await verifyWebhook(request, { signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET });
    } catch {
      return json({ error: "Invalid webhook signature" }, 400);
    }
    const { attachClerkUser } = await import("./lib/cloudflare");
    if (event.type === "user.created" || event.type === "user.updated") {
      const email = event.data.email_addresses[0]?.email_address;
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

  if (url.pathname === "/api/db" && env.DB) {
    if (request.method === "GET") return json(await readState(env.DB));
    if (request.method === "PUT") {
      await writeState(env.DB, (await request.json()) as import("./lib/types").DB);
      return json({ ok: true });
    }
  }

  if (url.pathname === "/api/auth/sync" && env.DB && request.method === "POST") {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token || !env.CLERK_SECRET_KEY) return json({ error: "Authentication required" }, 401);
    let clerkId: string;
    try {
      const claims = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
      clerkId = claims.sub;
    } catch {
      return json({ error: "Invalid Clerk session" }, 401);
    }
    const input = (await request.json()) as {
      email?: string;
      displayName?: string;
      username?: string;
    };
    if (!input.email || !input.displayName || !input.username)
      return json({ error: "Incomplete account profile" }, 400);
    const { attachClerkUser } = await import("./lib/cloudflare");
    try {
      return json({
        id: await attachClerkUser(env.DB, clerkId, {
          email: input.email,
          displayName: input.displayName,
          username: input.username,
        }),
      });
    } catch (error) {
      console.error("[v0] Clerk account sync failed:", error);
      return json({ error: "Account storage is unavailable" }, 503);
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

  if (url.pathname === "/api/media" && env.MEDIA && request.method === "POST") {
    const form = await request.formData();
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
      const apiResponse = await handleCloudflareApi(request, env as CloudflareEnv);
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
