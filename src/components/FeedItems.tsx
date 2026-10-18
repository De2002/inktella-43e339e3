import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { attempt } from "@/lib/auth";
import { editPost, likeInfo, useDB } from "@/lib/store";
import { categoryLabel } from "@/lib/tabs";
import type { Post, Question, Review, Title } from "@/lib/types";
import { Avatar, EpisodeTag, Spoiler, TimeAgo, TitleLink, UserLink } from "./bits";
import { ItemMenu, LikeButton, Replies, ReplyButton, ShareButton } from "./Engagement";

function TitleTag({ title, label }: { title?: Title; label: string }) {
  if (!title) return null;
  return (
    <div className="mb-1 text-xs text-muted-foreground">
      <span className="uppercase tracking-wider">{label}</span> · <TitleLink title={title} className="hover:text-foreground hover:underline" />
    </div>
  );
}

export function PostItem({ post, showTitle }: { post: Post; showTitle?: boolean }) {
  const db = useDB();
  const author = db.users.find((u) => u.id === post.userId);
  const title = db.titles.find((t) => t.id === post.titleId);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const replies = db.replies.filter((r) => r.targetType === "post" && r.targetId === post.id && !r.removed).length;
  const tab = post.category === "trailer_thought" ? "trailer" : post.category === "director_note" ? "director" : post.category + "s";
  const path = title ? `/${title.kind}/${title.slug}?tab=${tab}` : "/";

  return (
    <article className="flex gap-3 border-b py-5">
      <Avatar user={author} />
      <div className="min-w-0 flex-1">
        {showTitle && <TitleTag title={title} label={categoryLabel[post.category]} />}
        <div className="flex items-center gap-2 text-sm">
          <UserLink user={author} />
          <span className="text-subtle">·</span>
          <TimeAgo iso={post.createdAt} />
          {post.updatedAt && <span className="text-xs text-subtle">edited</span>}
          <EpisodeTag season={post.season} episode={post.episode} />
          <span className="ml-auto"><ItemMenu type="post" id={post.id} ownerId={post.userId} onEdit={() => setEditing(true)} /></span>
        </div>
        <div className="mt-1.5">
          {editing ? (
            <div className="space-y-2">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" className="rounded-full" onClick={() => attempt(() => editPost(post.id, draft)) && setEditing(false)}>Save</Button>
              </div>
            </div>
          ) : (
            <Spoiler active={post.spoiler}>
              {post.category === "quote" ? (
                <div>
                  <blockquote className="font-display text-2xl leading-snug">“{post.body}”</blockquote>
                  {post.quoteCharacter && <p className="mt-1 text-sm text-muted-foreground">— {post.quoteCharacter}</p>}
                  {post.quoteNote && <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{post.quoteNote}</p>}
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-[16px] leading-relaxed">{post.body}</p>
              )}
            </Spoiler>
          )}
        </div>
        <div className="mt-3 flex items-center gap-6">
          <LikeButton type="post" id={post.id} />
          <ReplyButton count={replies} onClick={() => setReplying((r) => !r)} />
          <ShareButton path={path} />
        </div>
        {replying && <Replies targetType="post" targetId={post.id} autoFocus />}
      </div>
    </article>
  );
}

export function ReviewCard({ review, showTitle }: { review: Review; showTitle?: boolean }) {
  const db = useDB();
  const author = db.users.find((u) => u.id === review.userId);
  const title = db.titles.find((t) => t.id === review.titleId);
  const replies = db.replies.filter((r) => r.targetType === "review" && r.targetId === review.id && !r.removed).length;
  const excerpt = review.body.length > 240 ? review.body.slice(0, 240).trimEnd() + "…" : review.body;
  const likes = likeInfo(db, "review", review.id).count;
  return (
    <article className="border-b py-6">
      {showTitle && <TitleTag title={title} label="Review" />}
      <div className="flex items-center gap-2 text-sm">
        <Avatar user={author} size={26} />
        <UserLink user={author} />
        <span className="text-subtle">·</span>
        <TimeAgo iso={review.createdAt} />
      </div>
      <Link to="/reviews/$id" params={{ id: review.id }} className="group mt-3 block">
        {review.heading && <h3 className="text-2xl leading-tight group-hover:underline">{review.heading}</h3>}
        {review.spoiler ? (
          <p className="mt-1 text-sm italic text-muted-foreground">This review contains spoilers. Open it to read.</p>
        ) : (
          <p className="mt-1.5 whitespace-pre-line leading-relaxed text-muted-foreground">{excerpt}</p>
        )}
        <span className="mt-2 inline-block text-sm text-foreground underline-offset-4 group-hover:underline">Read more</span>
      </Link>
      <div className="mt-3 flex gap-5 text-sm text-subtle">
        <span>{likes} {likes === 1 ? "like" : "likes"}</span>
        <span>{replies} {replies === 1 ? "reply" : "replies"}</span>
      </div>
    </article>
  );
}

export function QuestionCard({ question, showTitle }: { question: Question; showTitle?: boolean }) {
  const db = useDB();
  const author = db.users.find((u) => u.id === question.userId);
  const title = db.titles.find((t) => t.id === question.titleId);
  const answers = db.answers.filter((a) => a.questionId === question.id && !a.removed);
  const top = [...answers].sort((a, b) => Number(b.helpful) - Number(a.helpful) || likeInfo(db, "answer", b.id).count - likeInfo(db, "answer", a.id).count)[0];
  const topAuthor = top && db.users.find((u) => u.id === top.userId);
  return (
    <article className="border-b py-6">
      {showTitle && <TitleTag title={title} label="Question" />}
      <Link to="/questions/$id" params={{ id: question.id }} className="group block">
        <Spoiler active={question.spoiler}>
          <h3 className="text-2xl leading-tight group-hover:underline">{question.text}</h3>
        </Spoiler>
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <UserLink user={author} />
        <span className="text-subtle">·</span>
        <TimeAgo iso={question.createdAt} />
        <EpisodeTag season={question.season} episode={question.episode} />
        <span className="text-subtle">·</span>
        <span>{answers.length} {answers.length === 1 ? "answer" : "answers"}</span>
      </div>
      {top && !top.spoiler && !question.spoiler && (
        <div className="mt-3 border-l-2 pl-3 text-[15px] leading-relaxed text-muted-foreground">
          <span className="mb-0.5 flex items-center gap-1 text-xs">
            {top.helpful && <CheckCircle2 className="size-3.5 text-helpful" />}
            {topAuthor?.displayName}
          </span>
          {top.body.length > 180 ? top.body.slice(0, 180) + "…" : top.body}
        </div>
      )}
      <Link to="/questions/$id" params={{ id: question.id }} className="mt-3 inline-block rounded-full border px-3 py-1 text-sm hover:bg-accent">
        Answer
      </Link>
    </article>
  );
}
