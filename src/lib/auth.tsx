import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/tanstack-react-start";
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { getDB, setSessionUserId, syncSessionUser } from "./store";
import type { User } from "./types";

type Mode = "signin" | "signup";
interface AuthCtx {
  /** Runs `action` now if signed in; otherwise prompts, then runs it after sign-in. */
  requireAuth: (action: () => void, reason?: string) => void;
  openAuth: (mode?: Mode) => void;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const pendingAction = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) {
      setSessionUserId(null);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    void (async () => {
      const token = await getToken();
      if (!token) throw new Error("Your sign-in session is not ready. Please try signing in again.");
      const response = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      const result = await response.json() as { user?: User; error?: string };
      if (!response.ok || !result.user) throw new Error(result.error ?? "We couldn't connect your account. Please try again.");
      if (cancelled) return;
      syncSessionUser(result.user);
      const action = pendingAction.current;
      pendingAction.current = null;
      if (action) run(action);
    })().catch((error) => {
      if (!cancelled) toast.error(error instanceof Error ? error.message : "Account sync failed.");
    });
    return () => { cancelled = true; controller.abort(); };
  }, [getToken, isLoaded, isSignedIn, user]);

  const run = (fn: () => void) => {
    try {
      fn();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const openAuth = useCallback((mode: Mode = "signin") => {
    const options = { signInForceRedirectUrl: window.location.href, signUpForceRedirectUrl: window.location.href };
    const redirect = mode === "signup" ? clerk.redirectToSignUp(options) : clerk.redirectToSignIn(options);
    void redirect.catch(() => toast.error("Sign-in couldn't open. Please try again."));
  }, [clerk]);

  const requireAuth = useCallback((action: () => void, why?: string) => {
    const db = getDB();
    if (isSignedIn && db.sessionUserId) return run(action);
    void why;
    if (isSignedIn) {
      pendingAction.current = action;
      toast.info("Your account is connecting. Please wait a moment.");
      return;
    }
    openAuth();
  }, [isSignedIn, openAuth]);

  const signOut = useCallback(() => {
    pendingAction.current = null;
    void clerk.signOut().then(() => setSessionUserId(null)).catch(() => toast.error("Sign-out failed. Please try again."));
  }, [clerk]);

  return <Ctx.Provider value={{ requireAuth, openAuth, signOut }}>{children}</Ctx.Provider>;
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
