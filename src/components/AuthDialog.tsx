import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/store";

interface Props {
  open: boolean;
  mode: "signin" | "signup";
  reason?: string;
  onModeChange: (m: "signin" | "signup") => void;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}

export function AuthDialog({ open, mode, reason, onModeChange, onOpenChange, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "signup") {
        if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
        if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Please enter a valid email.");
        const u = signUp({ email, password, displayName: name, username: username || name });
        toast.success(`Welcome, ${u.displayName}.`);
      } else {
        const u = signIn(email, password);
        toast.success(`Welcome back, ${u.displayName}.`);
      }
      setPassword("");
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-normal">
            {mode === "signin" ? "Welcome back" : "Join Inktella"}
          </DialogTitle>
          <DialogDescription>
            {reason ?? (mode === "signin" ? "Sign in to share what stayed with you." : "You don't have to be a critic to have something worth saying.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="au-name">Name</Label>
                <Input id="au-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="au-user">Username</Label>
                <Input id="au-user" value={username} onChange={(e) => setUsername(e.target.value)} required maxLength={30} />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="au-email">Email</Label>
            <Input id="au-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="au-pass">Password</Label>
            <Input id="au-pass" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" className="w-full rounded-full">
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <button type="button" className="text-foreground underline underline-offset-4" onClick={() => { setError(null); onModeChange(mode === "signin" ? "signup" : "signin"); }}>
            {mode === "signin" ? "Get started" : "Sign in"}
          </button>
        </p>
        <p className="text-center text-xs text-subtle">Demo accounts: amara@example.com / demo1234</p>
      </DialogContent>
    </Dialog>
  );
}
