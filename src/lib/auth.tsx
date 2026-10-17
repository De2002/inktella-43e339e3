import { createContext, useCallback, useContext, type ReactNode } from "react";
import { toast } from "sonner";
import { getDB } from "./store";

type Mode = "signin" | "signup";
interface AuthCtx {
  /** Runs `action` now if signed in; otherwise prompts, then runs it after sign-in. */
  requireAuth: (action: () => void, reason?: string) => void;
  openAuth: (mode?: Mode) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
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
    window.location.href = "https://accounts.inktella.com/sign-in";
  }, []);

  const openAuth = useCallback((m: Mode = "signin") => {
    window.location.href = `https://accounts.inktella.com/${m === "signup" ? "sign-up" : "sign-in"}`;
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
