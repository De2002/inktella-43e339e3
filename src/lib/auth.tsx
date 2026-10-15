import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getDB } from "./store";
import { AuthDialog } from "@/components/AuthDialog";

type Mode = "signin" | "signup";
interface AuthCtx {
  /** Runs `action` now if signed in; otherwise prompts, then runs it after sign-in. */
  requireAuth: (action: () => void, reason?: string) => void;
  openAuth: (mode?: Mode) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [reason, setReason] = useState<string | undefined>();
  const pending = useRef<(() => void) | null>(null);

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
    pending.current = action;
    setReason(why);
    setMode("signin");
    setOpen(true);
  }, []);

  const openAuth = useCallback((m: Mode = "signin") => {
    pending.current = null;
    setReason(undefined);
    setMode(m);
    setOpen(true);
  }, []);

  return (
    <Ctx.Provider value={{ requireAuth, openAuth }}>
      {children}
      <AuthDialog
        open={open}
        mode={mode}
        reason={reason}
        onModeChange={setMode}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) pending.current = null;
        }}
        onSuccess={() => {
          setOpen(false);
          const a = pending.current;
          pending.current = null;
          if (a) setTimeout(() => run(a), 0);
        }}
      />
    </Ctx.Provider>
  );
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
