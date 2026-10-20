import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verifyToken: vi.fn(), getUser: vi.fn(), ensure: vi.fn(), account: vi.fn() }));
vi.mock("@clerk/backend", () => ({ verifyToken: mocks.verifyToken, createClerkClient: () => ({ users: { getUser: mocks.getUser } }) }));
vi.mock("@/lib/cloudflare", async (original) => ({ ...await original<typeof import("@/lib/cloudflare")>(), ensureClerkUser: mocks.ensure, readAccount: mocks.account }));
import { handleCloudflareApi } from "@/server";
import { cloudflareEnv, type D1Database } from "@/lib/cloudflare";

const db = { prepare: vi.fn() } as unknown as D1Database;
const request = (token = "test-session") => new Request("https://inktella.example/api/auth/session", {
  method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {},
  body: JSON.stringify({ email: "attacker@example.com", displayName: "Forged", username: "forged" }),
});

describe("Clerk identity to D1 profile", () => {
  beforeEach(() => vi.resetAllMocks());
  it("resolves bindings from Nitro's request rather than the entry's second argument", () => {
    const req = request() as Request & { runtime: { cloudflare: { env: { DB: D1Database } } } };
    req.runtime = { cloudflare: { env: { DB: db } } };
    expect(cloudflareEnv(req, {} ).DB).toBe(db);
  });
  it("reports a missing D1 binding as unavailable", async () => {
    const response = await handleCloudflareApi(request(), {});
    expect(response?.status).toBe(503);
    expect(mocks.verifyToken).not.toHaveBeenCalled();
  });
  it("reports a missing Clerk secret as unavailable", async () => {
    const response = await handleCloudflareApi(request(), { DB: db });
    expect(response?.status).toBe(503);
  });
  it("rejects requests without a bearer session", async () => {
    const response = await handleCloudflareApi(request(""), { DB: db, CLERK_SECRET_KEY: "test-only" });
    expect(response?.status).toBe(401);
    expect(mocks.ensure).not.toHaveBeenCalled();
  });
  it("uses verified Clerk identity, not submitted profile values", async () => {
    mocks.verifyToken.mockResolvedValue({ sub: "user_clerk" });
    mocks.getUser.mockResolvedValue({ id: "user_clerk", primaryEmailAddressId: "email_1", emailAddresses: [{ id: "email_1", emailAddress: "verified@example.com", verification: { status: "verified" } }], firstName: "Real", lastName: "Member", username: "real_member" });
    mocks.ensure.mockResolvedValue("app_user");
    mocks.account.mockResolvedValue({ id: "app_user", status: "active" });
    const response = await handleCloudflareApi(request(), { DB: db, CLERK_SECRET_KEY: "test-only" });
    expect(response?.status).toBe(200);
    expect(mocks.ensure).toHaveBeenCalledWith(db, "user_clerk", { email: "verified@example.com", displayName: "Real Member", username: "real_member" });
    expect(mocks.verifyToken).toHaveBeenCalledWith("test-session", expect.objectContaining({ authorizedParties: ["https://inktella.example"] }));
    expect(await response?.json()).toEqual({ id: "app_user", user: { id: "app_user", status: "active" } });
  });
  it("rejects unverified primary email addresses", async () => {
    mocks.verifyToken.mockResolvedValue({ sub: "user_clerk" });
    mocks.getUser.mockResolvedValue({ primaryEmailAddressId: "email_1", emailAddresses: [{ id: "email_1", verification: { status: "unverified" } }] });
    const response = await handleCloudflareApi(request(), { DB: db, CLERK_SECRET_KEY: "test-only" });
    expect(response?.status).toBe(422);
    expect(mocks.ensure).not.toHaveBeenCalled();
  });
});
import { handleCloudflareApi as handleApi } from "@/server";
describe("/api/db writes", () => {
  it("rejects saves without a signed-in session", async () => {
    const db = { prepare: () => ({ bind: () => ({ first: async () => null, run: async () => ({}) }) }) };
    const res = await handleApi(new Request("https://x.test/api/db", { method: "PUT", body: "{}" }), { DB: db as never, CLERK_SECRET_KEY: "sk_test" });
    expect(res?.status).toBe(401);
  });
});
