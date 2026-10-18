import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/lib/auth";
import { getDB, signIn, signOut } from "@/lib/store";
import { TitleActions } from "@/components/TitleActions";

// This suite exercises the sheet, not Clerk's hosted sign-in UI.
vi.mock("@/lib/auth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ requireAuth: (action: () => void) => action() }),
  attempt: (action: () => void) => { action(); return true; },
}));

// Drawer needs these in jsdom.
window.HTMLElement.prototype.scrollIntoView = () => {};
window.matchMedia ??= ((q: string) => ({
  matches: false, media: q, onchange: null,
  addListener: () => {}, removeListener: () => {},
  addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
})) as typeof window.matchMedia;

function setup() {
  // Fresh, not-yet-watched title per test: the in-memory store persists across tests.
  const db = getDB();
  const me = db.users.find((u) => u.id === db.sessionUserId);
  if (!me) throw new Error("Missing test account");
  const title = db.titles.find(
    (t) =>
      !db.library.some((l) => l.userId === me.id && l.titleId === t.id) &&
      !db.recommendations.some((r) => r.userId === me.id && r.titleId === t.id),
  );
  if (!title) throw new Error("Missing fresh test title");
  render(
    <AuthProvider>
      <TitleActions title={title} />
    </AuthProvider>,
  );
  return title;
}

describe("Watched → recommend sheet", () => {
  beforeEach(() => {
    window.localStorage.clear();
    signOut();
    signIn("amara@example.com", "demo1234");
  });
  afterEach(cleanup);

  it("saves watched immediately and asks for a recommendation", async () => {
    const title = setup();
    fireEvent.click(screen.getByRole("button", { name: /Watched/ }));
    const db = getDB();
    const me = db.users.find((u) => u.id === db.sessionUserId);
    if (!me) throw new Error("Missing test account");
    expect(db.library.some((l) => l.userId === me.id && l.titleId === title.id && l.state === "watched")).toBe(true);
    expect(await screen.findByText("Would you recommend it?")).toBeTruthy();
  });

  it("submits instantly and dismisses the sheet", async () => {
    const title = setup();
    fireEvent.click(screen.getByRole("button", { name: /Watched/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Yes, I'd recommend it/ }));
    const db = getDB();
    const me = db.users.find((u) => u.id === db.sessionUserId);
    if (!me) throw new Error("Missing test account");
    expect(db.recommendations.some((r) => r.userId === me.id && r.titleId === title.id && r.value === "yes")).toBe(true);
  });

  it("does not show the prompt again after voting", async () => {
    const title = setup();
    fireEvent.click(screen.getByRole("button", { name: /Watched/ }));
    fireEvent.click(await screen.findByRole("button", { name: /No, I wouldn't/ }));
    // unmark, then mark watched again
    fireEvent.click(screen.getByRole("button", { name: /Watched/ }));
    fireEvent.click(screen.getByRole("button", { name: /Watched/ }));
    expect(screen.queryByText("Would you recommend it?")).toBeNull();
  });
});
