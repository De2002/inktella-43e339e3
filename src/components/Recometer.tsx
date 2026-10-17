import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { attempt, useAuth } from "@/lib/auth";
import { setRecommendation, useCurrentUser, useDB } from "@/lib/store";
import type { Title } from "@/lib/types";

/** Bottom sheet shown after marking a title as watched. */
export function RecommendSheet({ title, open, onClose }: { title: Title; open: boolean; onClose: () => void }) {
  const vote = (value: "yes" | "no") => {
    if (attempt(() => setRecommendation(title.id, value), "Thanks for your recommendation!")) onClose();
  };
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader className="text-center">
          <DrawerTitle className="font-display text-2xl">Would you recommend it?</DrawerTitle>
          <DrawerDescription>{title.name}</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-2 px-6 pb-8">
          <Button size="lg" className="rounded-full" onClick={() => vote("yes")}>
            <ThumbsUp /> Yes, I'd recommend it
          </Button>
          <Button size="lg" variant="outline" className="rounded-full" onClick={() => vote("no")}>
            <ThumbsDown /> No, I wouldn't
          </Button>
          <button onClick={onClose} className="mt-1 py-2 text-sm text-muted-foreground hover:text-foreground">
            Not now
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** Public Recometer: stacked percentage bar, totals, and vote/change controls. */
export function Recometer({ title }: { title: Title }) {
  const db = useDB();
  const me = useCurrentUser();
  const { requireAuth } = useAuth();
  const votes = db.recommendations.filter((r) => r.titleId === title.id);
  const yes = votes.filter((v) => v.value === "yes").length;
  const total = votes.length;
  const no = total - yes;
  const yesPct = total ? Math.round((yes / total) * 100) : 0;
  const noPct = total ? 100 - yesPct : 0;
  const mine = me ? votes.find((v) => v.userId === me.id)?.value : undefined;

  const castVote = (value: "yes" | "no") =>
    requireAuth(() => setRecommendation(title.id, value), "Sign in to share whether you'd recommend this.");

  return (
    <section aria-label="Recometer" className="mt-6 rounded-lg border p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-xl">Recometer</h2>
        <p className="text-xs text-muted-foreground">
          {total === 0 ? "No recommendations yet" : `${total.toLocaleString()} ${total === 1 ? "vote" : "votes"}`}
        </p>
      </div>

      {total > 0 ? (
        <>
          <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img"
            aria-label={`${yesPct}% would recommend, ${noPct}% wouldn't recommend`}>
            <div className="bg-foreground transition-all" style={{ width: `${yesPct}%` }} />
            <div className="bg-muted-foreground/40 transition-all" style={{ width: `${noPct}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span><strong>{yesPct}%</strong> <span className="text-muted-foreground">Would recommend</span></span>
            <span><span className="text-muted-foreground">Wouldn't recommend</span> <strong>{noPct}%</strong></span>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Be the first to say whether you'd recommend this {title.kind}.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={mine === "yes" ? "default" : "outline"} className="rounded-full"
          aria-pressed={mine === "yes"} onClick={() => castVote("yes")}>
          <ThumbsUp /> Would recommend
        </Button>
        <Button size="sm" variant={mine === "no" ? "default" : "outline"} className="rounded-full"
          aria-pressed={mine === "no"} onClick={() => castVote("no")}>
          <ThumbsDown /> Wouldn't recommend
        </Button>
        {mine && <span className="text-xs text-muted-foreground">You can change your mind anytime.</span>}
      </div>

    </section>
  );
}
