import { beforeEach, describe, expect, it } from "vitest";
import { getDB, setRecommendation, signIn, signOut } from "@/lib/store";

const EMAIL = "amara@example.com";
const PASS = "demo1234";

function titleId() {
  return getDB().titles[0].id;
}

function myVote() {
  const db = getDB();
  const me = db.users.find((u) => u.id === db.sessionUserId)!;
  return db.recommendations.filter((r) => r.userId === me.id && r.titleId === titleId());
}

describe("Recometer", () => {
  beforeEach(() => {
    window.localStorage.clear();
    signOut();
    signIn(EMAIL, PASS);
  });

  it("stores one vote per person per title", () => {
    setRecommendation(titleId(), "yes");
    setRecommendation(titleId(), "yes");
    expect(myVote()).toHaveLength(1);
  });

  it("allows changing a vote instead of adding a second one", () => {
    setRecommendation(titleId(), "yes");
    setRecommendation(titleId(), "no");
    const votes = myVote();
    expect(votes).toHaveLength(1);
    expect(votes[0].value).toBe("no");
  });

  it("requires sign-in to vote", () => {
    signOut();
    expect(() => setRecommendation(titleId(), "yes")).toThrow();
  });
});
