import { useState } from "react";
import { Heart, MessageCircle, MoreHorizontal, Share } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { attempt, useAuth } from "@/lib/auth";
import {
  createReply,
  deleteOwn,
  likeInfo,
  report,
  toggleLike,
  useCurrentUser,
  useDB,
} from "@/lib/store";
import type { ReplyTarget, TargetType } from "@/lib/types";
import { Avatar, Spoiler, TimeAgo, UserLink } from "./bits";

export function LikeButton({ type, id }: { type: TargetType; id: string }) {
  const db = useDB();
  const me = useCurrentUser();
  const { requireAuth } = useAuth();
  const { count, liked } = likeInfo(db, type, id, me?.id);
  return (
    <button
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      onClick={() => requireAuth(() => toggleLike(type, id), "Sign in to like this.")}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm transition-colors hover:text-like",
        liked ? "text-like" : "text-muted-foreground",
      )}
    >
      <Heart className={cn("size-4", liked && "fill-current")} />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

export function ReplyButton({
  count,
  onClick,
  label = "Reply",
}: {
  count: number;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <MessageCircle className="size-4" />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

export function ShareButton({ path }: { path: string }) {
  return (
    <button
      aria-label="Share"
      onClick={async () => {
        const url = window.location.origin + path;
        try {
          if (navigator.share) await navigator.share({ url });
          else {
            await navigator.clipboard.writeText(url);
            toast.success("Link copied");
          }
        } catch {
          /* cancelled */
        }
      }}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <Share className="size-4" />
    </button>
  );
}

export function ItemMenu({
  type,
  id,
  ownerId,
  onEdit,
}: {
  type: TargetType;
  id: string;
  ownerId: string;
  onEdit?: () => void;
}) {
  const me = useCurrentUser();
  const { requireAuth } = useAuth();
  const mine = me?.id === ownerId;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="More options"
        className="rounded-full p-1 text-subtle hover:text-foreground"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {mine && onEdit && <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>}
        {(mine || me?.role === "admin") && (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => {
              if (window.confirm("Delete this for good?"))
                attempt(() => deleteOwn(type, id), "Deleted");
            }}
          >
            Delete
          </DropdownMenuItem>
        )}
        {!mine && (
          <DropdownMenuItem
            onClick={() =>
              requireAuth(() => {
                const reason = window.prompt(
                  "What's wrong with this? (spam, spoilers, abuse, copyright…)",
                );
                if (reason !== null)
                  attempt(() => report(type, id, reason), "Thanks. Our team will take a look.");
              }, "Sign in to report content.")
            }
          >
            Report
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ReplyComposer({
  targetType,
  targetId,
  open,
  onOpenChange,
  replyingTo,
}: {
  targetType: ReplyTarget;
  targetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replyingTo?: string;
}) {
  const { requireAuth } = useAuth();
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const submit = () =>
    requireAuth(() => {
      if (attempt(() => createReply(targetType, targetId, body, spoiler))) {
        setBody("");
        setSpoiler(false);
        onOpenChange(false);
      }
    }, "Sign in to reply.");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reply{replyingTo ? ` to ${replyingTo}` : ""}</DialogTitle>
        </DialogHeader>
        <Textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a reply…"
          rows={5}
          maxLength={1000}
          className="resize-none border-0 bg-muted shadow-none focus-visible:ring-1"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={spoiler} onCheckedChange={setSpoiler} /> Spoiler
          </label>
          <Button className="rounded-full" disabled={!body.trim()} onClick={submit}>
            Reply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Replies({
  targetType,
  targetId,
  onReply,
}: {
  targetType: ReplyTarget;
  targetId: string;
  onReply?: (userName?: string) => void;
}) {
  const db = useDB();
  const replies = db.replies
    .filter((r) => r.targetType === targetType && r.targetId === targetId && !r.removed)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="mt-3 space-y-4 border-l pl-4">
      {replies.map((r) => {
        const u = db.users.find((x) => x.id === r.userId);
        return (
          <div key={r.id} className="flex gap-3">
            <Avatar user={u} size={26} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm">
                <UserLink user={u} />
                <span className="text-subtle">·</span>
                <TimeAgo iso={r.createdAt} />
                <span className="ml-auto">
                  <ItemMenu type="reply" id={r.id} ownerId={r.userId} />
                </span>
              </div>
              <Spoiler active={r.spoiler}>
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{r.body}</p>
              </Spoiler>
              <div className="mt-1 flex items-center gap-4">
                <LikeButton type="reply" id={r.id} />
                {onReply && (
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => onReply(u?.displayName)}
                  >
                    Reply
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
