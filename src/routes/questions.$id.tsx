import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { attempt, useAuth } from "@/lib/auth";
import {
  createAnswer,
  editAnswer,
  likeInfo,
  toggleHelpful,
  useCurrentUser,
  useDB,
} from "@/lib/store";
import type { Answer } from "@/lib/types";
import {
  Avatar,
  Empty,
  EpisodeTag,
  Poster,
  Spoiler,
  TimeAgo,
  TitleLink,
  UserLink,
} from "@/components/bits";
import {
  ItemMenu,
  LikeButton,
  Replies,
  ReplyButton,
  ReplyComposer,
  ShareButton,
} from "@/components/Engagement";

export const Route = createFileRoute("/questions/$id")({
  head: () => ({
    meta: [
      { title: "Question — Inktella" },
      { name: "description", content: "A community question and its answers on Inktella." },
      { property: "og:title", content: "Question — Inktella" },
      { property: "og:description", content: "A community question and its answers on Inktella." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuestionPage,
});

function AnswerItem({ a, canMark }: { a: Answer; canMark: boolean }) {
  const db = useDB();
  const author = db.users.find((u) => u.id === a.userId);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(a.body);
  const replies = db.replies.filter(
    (r) => r.targetType === "answer" && r.targetId === a.id && !r.removed,
  ).length;
  return (
    <article className="border-b py-6">
      <div className="flex items-center gap-2 text-sm">
        <Avatar user={author} size={30} />
        <UserLink user={author} />
        <span className="text-subtle">·</span>
        <TimeAgo iso={a.createdAt} />
        {a.helpful && (
          <span className="inline-flex items-center gap-1 text-xs text-helpful">
            <CheckCircle2 className="size-3.5" /> Helpful
          </span>
        )}
        <span className="ml-auto">
          <ItemMenu type="answer" id={a.id} ownerId={a.userId} onEdit={() => setEditing(true)} />
        </span>
      </div>
      <div className="mt-3">
        {editing ? (
          <div className="space-y-2">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-full"
                onClick={() => attempt(() => editAnswer(a.id, draft)) && setEditing(false)}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <Spoiler active={a.spoiler}>
            <div className="whitespace-pre-wrap text-[16px] leading-relaxed">{a.body}</div>
          </Spoiler>
        )}
      </div>
      <div className="mt-3 flex items-center gap-6">
        <LikeButton type="answer" id={a.id} />
        <ReplyButton count={replies} onClick={() => setReplying((r) => !r)} />
        {canMark && (
          <button
            onClick={() => attempt(() => toggleHelpful(a.id))}
            className={cn(
              "text-sm",
              a.helpful ? "text-helpful" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {a.helpful ? "Marked helpful" : "Mark helpful"}
          </button>
        )}
      </div>
      <Replies targetType="answer" targetId={a.id} onReply={() => setReplying(true)} />
      <ReplyComposer
        targetType="answer"
        targetId={a.id}
        open={replying}
        onOpenChange={setReplying}
        replyingTo={author?.displayName}
      />
    </article>
  );
}

function QuestionPage() {
  const { id } = Route.useParams();
  const db = useDB();
  const me = useCurrentUser();
  const { requireAuth } = useAuth();
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const q = db.questions.find((x) => x.id === id && !x.removed);
  if (!q) return <Empty>This question isn't available.</Empty>;
  const author = db.users.find((u) => u.id === q.userId);
  const title = db.titles.find((t) => t.id === q.titleId)!;
  const answers = db.answers
    .filter((a) => a.questionId === q.id && !a.removed)
    .sort(
      (a, b) =>
        Number(b.helpful) - Number(a.helpful) ||
        likeInfo(db, "answer", b.id).count - likeInfo(db, "answer", a.id).count ||
        a.createdAt.localeCompare(b.createdAt),
    );

  const submit = () =>
    requireAuth(() => {
      if (attempt(() => createAnswer(q.id, body, spoiler))) {
        setBody("");
        setSpoiler(false);
      }
    }, "Sign in to answer — we'll post it right after.");

  return (
    <div className="mx-auto max-w-2xl pt-8">
      <TitleLink
        title={title}
        className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground"
      >
        <Poster title={title} size="xs" className="w-8" />
        <span>
          Question about <span className="text-foreground">{title.name}</span>
        </span>
      </TitleLink>
      <Spoiler active={q.spoiler}>
        <h1 className="mt-6 text-4xl leading-tight">{q.text}</h1>
        {q.details && (
          <p className="mt-3 whitespace-pre-wrap leading-relaxed text-muted-foreground">
            {q.details}
          </p>
        )}
      </Spoiler>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <Avatar user={author} size={26} />
        <UserLink user={author} />
        <span className="text-subtle">·</span>
        <TimeAgo iso={q.createdAt} />
        <EpisodeTag season={q.season} episode={q.episode} />
        <span className="ml-auto flex items-center gap-4">
          <LikeButton type="question" id={q.id} />
          <ShareButton path={`/questions/${q.id}`} />
          <ItemMenu type="question" id={q.id} ownerId={q.userId} />
        </span>
      </div>

      <div className="mt-8 rounded-xl bg-muted p-4">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Share your answer or interpretation…"
          className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={spoiler} onCheckedChange={setSpoiler} /> Contains spoilers
          </label>
          <Button size="sm" className="rounded-full px-5" disabled={!body.trim()} onClick={submit}>
            Answer
          </Button>
        </div>
      </div>

      <h2 className="mt-10 text-2xl">
        {answers.length} {answers.length === 1 ? "answer" : "answers"}
      </h2>
      {answers.length === 0 && (
        <Empty>No answers yet. Your take might be the one that helps.</Empty>
      )}
      {answers.map((a) => (
        <AnswerItem key={a.id} a={a} canMark={me?.id === q.userId} />
      ))}
    </div>
  );
}
