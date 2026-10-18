# Inktella sign-in on Cloudflare

Clerk authenticates people. D1 stores their Inktella profile. The webhook is optional for sign-in: `/api/auth/sync` also creates or updates the account after sign-in.

## 1. Build environment

Set `VITE_CLERK_PUBLISHABLE_KEY` to the publishable key from the same Clerk application as the secret key. This variable must exist **during the build**. Adding it only to Worker runtime settings does not update the browser bundle. Rebuild and redeploy after changing it.

## 2. Worker runtime secrets

Add these to the **Worker serving Inktella**, not a different Worker or environment:

- `CLERK_SECRET_KEY`: Clerk secret key (never prefix this with `VITE_`).
- `CLERK_WEBHOOK_SIGNING_SECRET`: optional; required only when enabling the webhook.

Clerk development keys belong together, and production keys belong together. Never mix applications or environments.

## 3. Bindings and migrations

The checked-in `wrangler.jsonc` contains the existing D1 database ID, not a placeholder. Confirm it matches your Cloudflare database. The Worker must have D1 binding **DB** and R2 binding **MEDIA**. Keys cannot create these bindings.

Apply the checked-in migrations to the remote database before testing sign-in:

```sh
bunx wrangler d1 migrations apply inktella --remote --config wrangler.jsonc
```

For external deployment, use your normal build and deploy **Nitro's generated Wrangler configuration**, not the source configuration on its own. Nitro adds the compiled entry and static assets. Typical output is `.output/server/wrangler.json`; confirm the actual output path in your build log. Inspect that generated configuration for the DB/MEDIA bindings and correct migration path before deployment. Do not deploy the legacy TOML file alongside the JSONC file.

```sh
bunx wrangler deploy --config .output/server/wrangler.json
```

## 4. Clerk application settings

Use Clerk's configured Account Portal URLs for sign-in and sign-up. The app now asks Clerk for these URLs instead of hardcoding accounts.inktella.com. Set the application home URL to the deployed Inktella origin and allow its return URLs. Configure any custom account domain and its DNS in Clerk before using it. Ensure the primary email is verified.

## 5. Optional webhook

Create an endpoint at `https://YOUR-ACTUAL-APP-DOMAIN/api/public/webhooks/clerk`, subscribe to `user.created` and `user.updated`, and add that endpoint's signing secret to the same Worker. The existing `/api/webhooks/clerk` address remains supported for direct Cloudflare deployments. Unsigned requests are rejected.

## 6. Check a real sign-in

Open the deployed site, sign in, and return to the page. In the browser Network panel, `/api/auth/sync` should return 200 and the verified profile; the header should show the account menu. A 503 now distinguishes missing DB binding, missing secret key, and failed account storage/migrations. A 401 means the session token could not be verified. Sign out and confirm the Clerk session ends.

These instructions do not certify production readiness of the older whole-snapshot `/api/db` and media APIs: their write authorization still needs a separate review before public launch.