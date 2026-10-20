import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { attempt, useAuth } from "@/lib/auth";
import { useAuth as useClerkAuth } from "@clerk/tanstack-react-start";
import { deleteAccount, updateProfile, useCurrentUser, useDB } from "@/lib/store";
import { applyTheme, getThemePref, type ThemePref } from "@/lib/theme";
import { Avatar, PageHeader } from "@/components/bits";
import { uploadUserMedia } from "@/lib/store";

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
  const { getToken } = useClerkAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<ThemePref>("system");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [favoriteTitleIds, setFavoriteTitleIds] = useState<string[]>(["", "", "", ""]);
  const [showTrail, setShowTrail] = useState(true);
  const [ellaEnabled, setEllaEnabled] = useState(true);
  const [ellaGenerating, setEllaGenerating] = useState(false);
  const [avatarKey, setAvatarKey] = useState<string | undefined>();
  const db = useDB();
  useEffect(() => setTheme(getThemePref()), []);
  useEffect(() => {
    if (me) {
      setName(me.displayName);
      setUsername(me.username);
      setBio(me.bio ?? "");
      setAvatarKey(me.avatarKey);
      setFavoriteTitleIds([...(me.favoriteTitleIds ?? []), "", "", ""].slice(0, 4));
      setShowTrail(me.showTrail !== false);
      setEllaEnabled(me.ellaEnabled !== false);
    }
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
          <form className="space-y-4 border-b py-8" onSubmit={async (e) => { e.preventDefault(); try { const file = (document.getElementById("s-avatar") as HTMLInputElement | null)?.files?.[0]; const nextAvatarKey = file ? await uploadUserMedia(file, "avatar") : avatarKey; setAvatarKey(nextAvatarKey); attempt(() => updateProfile(me.id, { displayName: name, username, bio, avatarKey: nextAvatarKey, favoriteTitleIds, showTrail }), "Profile saved"); } catch (error) { attempt(() => { throw error; }); } }}>
            <h2 className="text-2xl">Profile</h2>
            <div className="flex items-center gap-4"><Avatar user={{ ...me, avatarKey }} size={64} /><div className="space-y-1.5"><Label htmlFor="s-avatar">Profile picture</Label><Input id="s-avatar" type="file" accept="image/jpeg,image/png,image/webp" /><p className="text-xs text-subtle">Stored securely in R2 and shown across Inktella.</p></div></div>
            <div className="space-y-1.5"><Label htmlFor="s-name">Display name</Label><Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></div>
            <div className="space-y-1.5"><Label htmlFor="s-user">Username</Label><Input id="s-user" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30} /></div>
            <div className="space-y-1.5"><Label htmlFor="s-bio">Bio</Label><Textarea id="s-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3} /></div>
            <fieldset className="space-y-3 pt-2">
              <legend className="font-display text-2xl">Favourite Films</legend>
              <p className="text-sm text-muted-foreground">Choose up to four titles from Inktella. Leave any slot blank to show fewer.</p>
              <label className="flex items-center gap-3 text-sm text-muted-foreground">
    <input type="checkbox" checked={showTrail} onChange={(e) => setShowTrail(e.target.checked)} />
    Show my recent viewing trail on my profile
  </label>
  <div className="grid grid-cols-2 gap-3">
                {favoriteTitleIds.map((titleId, index) => (
                  <div key={index} className="space-y-1.5">
                    <Label htmlFor={`s-favourite-${index}`}>Slot {index + 1}</Label>
                    <select id={`s-favourite-${index}`} value={titleId} onChange={(e) => setFavoriteTitleIds((current) => current.map((value, i) => i === index ? e.target.value : value))} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                      <option value="">None</option>
                      {db.titles.filter((title) => !favoriteTitleIds.includes(title.id) || title.id === titleId).map((title) => <option key={title.id} value={title.id}>{title.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" className="rounded-full">Save</Button>
              <Button type="button" variant="outline" className="rounded-full" disabled={ellaGenerating} onClick={async () => {
                if (me.ellaGeneratedAt && Date.now() - Date.parse(me.ellaGeneratedAt) < 30 * 24 * 60 * 60 * 1000) return;
                setEllaGenerating(true);
                try {
                  const token = await getToken();
                  if (!token) throw new Error("Your sign-in session is not ready. Please try again.");
                  const response = await fetch("/api/ella/personality", { method: "POST", headers: { authorization: `Bearer ${token}` } });
                  const data = await response.json() as { description?: string; error?: string };
                  if (!response.ok || !data.description) throw new Error(data.error ?? "Ella could not generate a description yet.");
                  updateProfile(me.id, { displayName: name, username, bio, avatarKey, favoriteTitleIds, showTrail, ellaEnabled, ellaDescription: data.description, ellaGeneratedAt: new Date().toISOString() });
                } catch (error) { attempt(() => { throw error; }); } finally { setEllaGenerating(false); }
              }}>{ellaGenerating ? "Ella is writing…" : me.ellaGeneratedAt && Date.now() - Date.parse(me.ellaGeneratedAt) < 30 * 24 * 60 * 60 * 1000 ? "Available monthly" : "Generate with Ella"}</Button>
            </div>
            <label className="flex items-center gap-3 text-sm text-muted-foreground"><input type="checkbox" checked={ellaEnabled} onChange={(e) => { setEllaEnabled(e.target.checked); updateProfile(me.id, { displayName: name, username, bio, avatarKey, favoriteTitleIds, showTrail, ellaEnabled: e.target.checked }); }} /> Show Ella&apos;s description on my profile</label>
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
