import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDB } from "@/lib/store";
import { Avatar, Empty, Poster, Spoiler, TimeAgo, TitleLink, UserLink } from "@/components/bits";
import { ItemMenu, LikeButton, Replies, ShareButton } from "@/components/Engagement";

export const Route = createFileRoute("/reviews/$id")({
  head: () => ({
    meta: [
      { title: "Review — Inktella" },
      { name: "description", content: "A personal review and its discussion on Inktella." },
      { property: "og:title", content: "Review — Inktella" },
      { property: "og:description", content: "A personal review and its discussion on Inktella." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { id } = Route.useParams();
  const db = useDB();
  const navigate = useNavigate();
  const r = db.reviews.find((x) => x.id === id && !x.removed);
  if (!r) return <Empty>This review isn't available.</Empty>;
  const author = db.users.find((u) => u.id === r.userId);
  const title = db.titles.find((t) => t.id === r.titleId)!;

  return (
    <article className="mx-auto max-w-2xl pt-8">
      <TitleLink title={title} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground">
        <Poster title={title} size="xs" className="w-8" />
        <span>Review of <span className="text-foreground">{title.name}</span> ({title.year})</span>
      </TitleLink>
      {r.heading && <h1 className="mt-6 text-4xl leading-tight md:text-5xl">{r.heading}</h1>}
      <div className="mt-4 flex items-center gap-2 text-sm">
        <Avatar user={author} size={28} />
        <UserLink user={author} />
        <span className="text-subtle">·</span>
        <TimeAgo iso={r.createdAt} />
        {r.updatedAt && <span className="text-xs text-subtle">updated</span>}
        <span className="ml-auto">
          <ItemMenu type="review" id={r.id} ownerId={r.userId} onEdit={() => navigate({ to: title.kind === "movie" ? "/movie/$slug" : "/series/$slug", params: { slug: title.slug }, search: { tab: "reviews" } })} />
        </span>
      </div>
      <div className="mt-6">
        <Spoiler active={r.spoiler}>
          <div className="whitespace-pre-wrap text-[17px] leading-[1.75]">{r.body}</div>
        </Spoiler>
      </div>
      <div className="mt-6 flex items-center gap-6 border-b pb-4">
        <LikeButton type="review" id={r.id} />
        <ShareButton path={`/reviews/${r.id}`} />
      </div>
      <h2 className="mt-8 text-2xl">Discussion</h2>
      <Replies targetType="review" targetId={r.id} />
    </article>
  );
}
