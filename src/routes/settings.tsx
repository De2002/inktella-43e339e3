import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { attempt, useAuth } from "@/lib/auth";
import { deleteAccount, updateProfile, useCurrentUser } from "@/lib/store";
import { applyTheme, getThemePref, type ThemePref } from "@/lib/theme";
import { PageHeader } from "@/components/bits";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Inktella" },
      { name: "description", content: "Manage your Inktella profile, appearance and account." },
      { property: "og:title", content: "Settings — Inktella" },
      { property: "og:description", content: "Manage your Inktella profile, appearance and account." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const me = useCurrentUser();
  const { openAuth } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<ThemePref>("system");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  useEffect(() => setTheme(getThemePref()), []);
  useEffect(() => {
    if (me) { setName(me.displayName); setUsername(me.username); setBio(me.bio ?? ""); }
  }, [me?.id]);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Settings" />
      <section className="space-y-3 border-b pb-8">
        <h2 className="text-2xl">Appearance</h2>
        <div className="flex gap-2">
          {(["system", "light", "dark"] as const).map((t) => (
            <button key={t} onClick={() => { setTheme(t); applyTheme(t); }} className={cn("rounded-full border px-4 py-1.5 text-sm capitalize", theme === t ? "border-foreground bg-foreground text-background" : "text-muted-foreground")}>{t}</button>
          ))}
        </div>
      </section>
      {!me ? (
        <p className="py-8 text-muted-foreground"><button className="underline" onClick={() => openAuth()}>Sign in</button> to edit your profile.</p>
      ) : (
        <>
          <form className="space-y-4 border-b py-8" onSubmit={(e) => { e.preventDefault(); attempt(() => updateProfile(me.id, { displayName: name, username, bio }), "Profile saved"); }}>
            <h2 className="text-2xl">Profile</h2>
            <div className="space-y-1.5"><Label htmlFor="s-name">Display name</Label><Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></div>
            <div className="space-y-1.5"><Label htmlFor="s-user">Username</Label><Input id="s-user" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30} /></div>
            <div className="space-y-1.5"><Label htmlFor="s-bio">Bio</Label><Textarea id="s-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3} /></div>
            <Button type="submit" className="rounded-full">Save</Button>
          </form>
          <section className="space-y-3 py-8">
            <h2 className="text-2xl">Account</h2>
            <p className="text-sm text-muted-foreground">Signed in as {me.email}. Deleting your account removes your posts, reviews, questions, answers, replies, likes, library and collections.</p>
            <Button variant="destructive" className="rounded-full" onClick={() => {
              if (window.confirm("Delete your account and everything you've shared? This can't be undone.")) {
                deleteAccount(me.id);
                navigate({ to: "/", replace: true });
              }
            }}>Delete account</Button>
          </section>
        </>
      )}
      <p className="pb-8 text-sm text-muted-foreground"><Link to="/guidelines" className="underline">Community guidelines, privacy & terms</Link></p>
    </div>
  );
}
