import { useAuth as useClerkAuth, useUser } from "@clerk/tanstack-react-start";
import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { getDB, setSessionUserId } from "./store";

type Mode = "signin" | "signup";
interface AuthCtx {
  /** Runs `action` now if signed in; otherwise prompts, then runs it after sign-in. */
  requireAuth: (action: () => void, reason?: string) => void;
  openAuth: (mode?: Mode) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) {
      setSessionUserId(null);
      return;
    }
    void (async () => {
      const token = await getToken();
      const response = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: user.primaryEmailAddress?.emailAddress,
          displayName: user.fullName ?? user.username ?? "Inktella member",
          username: user.username ?? user.id.slice(-12),
        }),
      });
      if (!response.ok) throw new Error("We couldn't sync your account.");
      const result = (await response.json()) as { id: string };
      setSessionUserId(result.id);
    })().catch((error) => toast.error(error instanceof Error ? error.message : "Account sync failed."));
  }, [getToken, isLoaded, isSignedIn, user]);

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
    window.location.href = "https://accounts.inktella.com/sign-in?redirect_url=" + encodeURIComponent(window.location.href);
  }, []);

  const openAuth = useCallback((m: Mode = "signin") => {
    window.location.href = `https://accounts.inktella.com/${m === "signup" ? "sign-up" : "sign-in"}?redirect_url=${encodeURIComponent(window.location.href)}`;
  }, []);

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
