import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// Missing preview credentials must not block public browsing or enable fake auth.
const optionalClerkMiddleware = createMiddleware().server(async (options) => {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || process.env['CLERK_PUBLISHABLE_KEY'];
  const secretKey = process.env['CLERK_SECRET_KEY'];
  if (!publishableKey || !secretKey) return options.next();
  const handler = clerkMiddleware({ publishableKey, secretKey }).options.server;
  if (!handler) return options.next();
  return handler(options);
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, optionalClerkMiddleware, csrfMiddleware],
}));
