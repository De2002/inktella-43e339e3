import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";
import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { getDB, refreshStore, setClerkSession } from "./store";

type Mode = "signin" | "signup";
interface AuthCtx {
  /** Runs `action` now if signed in; otherwise prompts, then runs it after sign-in. */
  requireAuth: (action: () => void, reason?: string) => void;
  openAuth: (mode?: Mode) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { openSignIn, openSignUp } = useClerk();
  const { user } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    let cancelled = false;
    void (async () => {
      const email = user.primaryEmailAddress?.emailAddress;
      if (!email || cancelled) return;
      const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || email.split("@")[0];
      const username = (user.username || email.split("@")[0]).replace(/[^a-zA-Z0-9_]+/g, "_").slice(0, 40);
      const response = await fetch("/api/auth/sync", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "x-clerk-user-id": user.id },
        body: JSON.stringify({ email, displayName, username }),
      });
      if (!response.ok || cancelled) return;
      const { id } = (await response.json()) as { id?: string };
      if (!id || cancelled) return;
      await refreshStore();
      setClerkSession(user.id, id);
    })().catch((error) => {
      console.error("[v0] Clerk account sync failed", error);
    });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, user]);

  const run = (fn: () => void) => {
    try {
      fn();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const requireAuth = useCallback((action: () => void, why?: string) => {
    const db = getDB();
    if (db.sessionUserId) return run(action);
    void why;
    openSignIn({ redirectUrl: window.location.href });
  }, [openSignIn]);

  const openAuth = useCallback((m: Mode = "signin") => {
    if (m === "signup") openSignUp({ redirectUrl: window.location.href });
    else openSignIn({ redirectUrl: window.location.href });
  }, [openSignIn, openSignUp]);

  return <Ctx.Provider value={{ requireAuth, openAuth }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}

/** Wrap a store action with friendly error toasts. */
export function attempt(fn: () => void, success?: string) {
  try {
    fn();
    if (success) toast.success(success);
    return true;
  } catch (e) {
    toast.error((e as Error).message);
    return false;
  }
}
