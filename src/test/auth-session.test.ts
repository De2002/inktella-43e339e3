import { describe, expect, it } from "vitest";
import { getDB, syncSessionUser, setSessionUserId } from "@/lib/store";
import type { User } from "@/lib/types";

describe("Verified account hydration", () => {
  it("makes a newly synced D1 account available without waiting for a snapshot reload", () => {
    const user: User = { id: "new_clerk_account", clerkId: "clerk_account", username: "new_member", email: "member@example.com", displayName: "New Member", password: "", role: "user", status: "active", createdAt: "2026-10-18T00:00:00Z" };
    syncSessionUser(user);
    expect(getDB().sessionUserId).toBe(user.id);
    expect(getDB().users.find((entry) => entry.id === user.id)?.clerkId).toBe("clerk_account");
    syncSessionUser({ ...user, displayName: "Updated Member" });
    expect(getDB().users.filter((entry) => entry.id === user.id)).toHaveLength(1);
    setSessionUserId(null);
    expect(getDB().sessionUserId).toBeNull();
  });
});