import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { attempt, useAuth } from "@/lib/auth";
import { createPost, createQuestion, upsertReview, useCurrentUser, useDB } from "@/lib/store";
import type { TabConfig } from "@/lib/tabs";
import type { Title } from "@/lib/types";
import { Avatar } from "./bits";

function EpisodeFields({ season, episode, onSeason, onEpisode }: { season: string; episode: string; onSeason: (v: string) => void; onEpisode: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Season</span>
      <Input aria-label="Season" inputMode="numeric" value={season} onChange={(e) => onSeason(e.target.value.replace(/\D/g, "").slice(0, 2))} className="h-7 w-12 px-2 text-xs" />
      <span>Ep.</span>
      <Input aria-label="Episode" inputMode="numeric" value={episode} onChange={(e) => onEpisode(e.target.value.replace(/\D/g, "").slice(0, 3))} className="h-7 w-12 px-2 text-xs" />
    </div>
  );
}

const fieldClass = "resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 md:text-[17px]";

/** One reusable composer: the active tab changes its placeholder, fields and destination. */
export function Composer({ title, tab }: { title: Title; tab: TabConfig }) {
  const me = useCurrentUser();
  const db = useDB();
  const { requireAuth } = useAuth();
  const [body, setBody] = useState("");
  const [extra1, setExtra1] = useState(""); // quote character / review title / question details
  const [extra2, setExtra2] = useState(""); // quote note
  const [spoiler, setSpoiler] = useState(false);
  const [season, setSeason] = useState("");
  const [episode, setEpisode] = useState("");
  const [expanded, setExpanded] = useState(false);

  const myReview = tab.key === "reviews" && me ? db.reviews.find((r) => r.titleId === title.id && r.userId === me.id && !r.removed) : undefined;

  useEffect(() => {
    setBody("");
    setExtra1("");
    setExtra2("");
    setSpoiler(false);
    setExpanded(false);
  }, [tab.key]);

  useEffect(() => {
    if (myReview) {
      setBody(myReview.body);
      setExtra1(myReview.heading ?? "");
      setSpoiler(myReview.spoiler);
    }
  }, [myReview?.id]);

  const reset = () => {
    setBody("");
    setExtra1("");
    setExtra2("");
    setSpoiler(false);
    setSeason("");
    setEpisode("");
    setExpanded(false);
  };

  const ep = { season: Number(season) || undefined, episode: Number(episode) || undefined };

  const submit = () =>
    requireAuth(() => {
      const ok = attempt(() => {
        if (tab.key === "reviews") upsertReview({ titleId: title.id, heading: extra1, body, spoiler });
        else if (tab.key === "questions") createQuestion({ titleId: title.id, text: body, details: extra1, spoiler, ...ep });
        else createPost({ titleId: title.id, category: tab.category!, body, spoiler, quoteCharacter: extra1, quoteNote: extra2, ...ep });
      }, tab.key === "reviews" ? (myReview ? "Review updated" : "Review published") : undefined);
      if (ok && tab.key !== "reviews") reset();
    }, "Sign in to share this — we'll post it right after.");

  const isReview = tab.key === "reviews";
  const isQuote = tab.key === "quotes";
  const isQuestion = tab.key === "questions";
  const max = isReview ? 10000 : isQuote ? 300 : isQuestion ? 300 : 500;
  const open = expanded || body.length > 0;

  return (
    <div className="flex gap-3 border-b py-4">
      <div className="pt-1"><Avatar user={me ?? undefined} size={36} /></div>
      <div className="min-w-0 flex-1">
        {isReview && open && (
          <Input value={extra1} onChange={(e) => setExtra1(e.target.value)} placeholder="Title (optional)" maxLength={140} className="mb-1 h-auto border-0 bg-transparent px-0 font-display text-2xl shadow-none focus-visible:ring-0 md:text-2xl" />
        )}
        <Textarea
          value={body}
          onFocus={() => setExpanded(true)}
          onChange={(e) => setBody(e.target.value)}
          placeholder={myReview ? "Update your review…" : tab.placeholder(title.kind)}
          rows={isReview && open ? 8 : open ? 3 : 1}
          maxLength={max}
          className={`${fieldClass} ${isQuote ? "font-display text-xl italic md:text-xl" : ""} ${isQuestion ? "font-display text-xl md:text-xl" : ""}`}
          aria-label={tab.placeholder(title.kind)}
        />
        {open && isQuote && (
          <div className="mt-1 space-y-1">
            <Input value={extra1} onChange={(e) => setExtra1(e.target.value)} placeholder="— Who said it? (optional)" maxLength={80} className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
            <Textarea value={extra2} onChange={(e) => setExtra2(e.target.value)} placeholder="Why does it stay with you? (optional)" rows={2} maxLength={500} className={fieldClass} />
            <p className="text-xs text-subtle">Keep quotes short — a line or two, never whole scenes or scripts.</p>
          </div>
        )}
        {open && isQuestion && (
          <Textarea value={extra1} onChange={(e) => setExtra1(e.target.value)} placeholder="Add context (optional)" rows={2} maxLength={2000} className={fieldClass} />
        )}
        {open && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={spoiler} onCheckedChange={setSpoiler} aria-label="Contains spoilers" /> Contains spoilers
            </label>
            {title.kind === "series" && !isReview && (
              <EpisodeFields season={season} episode={episode} onSeason={setSeason} onEpisode={setEpisode} />
            )}
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-subtle">{body.length > max * 0.8 ? `${max - body.length}` : ""}</span>
              {!myReview && <button className="text-xs text-muted-foreground hover:text-foreground" onClick={reset}>Cancel</button>}
              <Button size="sm" className="rounded-full px-5" disabled={!body.trim()} onClick={submit}>
                {isReview ? (myReview ? "Update" : "Publish") : isQuestion ? "Ask" : "Post"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
