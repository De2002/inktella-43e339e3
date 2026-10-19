import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/tanstack-react-start";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { getDB, setAuthTokenGetter, setSessionUserId, syncSessionUser } from "./store";
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
  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
    const unavailable = () => toast.error("Sign-in isn't configured for this preview yet.");
    return <Ctx.Provider value={{ requireAuth: unavailable, openAuth: unavailable, signOut: unavailable }}>{children}</Ctx.Provider>;
  }
  return <ConnectedAuthProvider>{children}</ConnectedAuthProvider>;
}

function ConnectedAuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const pendingAction = useRef<(() => void) | null>(null);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptReason, setAuthPromptReason] = useState("Sign in to continue with this action.");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) {
      setAuthTokenGetter(null);
      setSessionUserId(null);
      return;
    }
    setAuthTokenGetter(() => getToken());
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
    const back = window.location.href;
    const redirect = mode === "signup"
      ? clerk.redirectToSignUp({ signUpForceRedirectUrl: back, signInForceRedirectUrl: back })
      : clerk.redirectToSignIn({ signInForceRedirectUrl: back, signUpForceRedirectUrl: back });
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
    pendingAction.current = action;
    setAuthPromptReason(why ?? "Sign in to continue with this action.");
    setAuthPromptOpen(true);
  }, [isSignedIn, openAuth]);

  const signOut = useCallback(() => {
    pendingAction.current = null;
    void clerk.signOut().then(() => setSessionUserId(null)).catch(() => toast.error("Sign-out failed. Please try again."));
  }, [clerk]);

  const chooseAuth = (mode: Mode) => {
    setAuthPromptOpen(false);
    openAuth(mode);
  };

  return (
    <Ctx.Provider value={{ requireAuth, openAuth, signOut }}>
      {children}
      <Sheet open={authPromptOpen} onOpenChange={setAuthPromptOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-8 sm:mx-auto sm:max-w-lg">
          <SheetHeader className="mx-auto max-w-md text-left">
            <SheetTitle className="font-display text-3xl font-normal">Keep this moment with you</SheetTitle>
            <SheetDescription className="pt-1 text-base leading-relaxed">
              {authPromptReason} Your browsing stays right here — sign in or create an account only if you&apos;d like to continue.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="mx-auto mt-6 grid w-full max-w-md grid-cols-2 gap-3 sm:flex-row">
            <Button type="button" variant="outline" className="h-11 rounded-full" onClick={() => chooseAuth("signin")}>
              Sign in
            </Button>
            <Button type="button" className="h-11 rounded-full" onClick={() => chooseAuth("signup")}>
              Create account
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
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
