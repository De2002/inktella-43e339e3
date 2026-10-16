import { createFileRoute } from "@tanstack/react-router";
import { TitlePage } from "@/components/TitlePage";
import { titleHead, validateTab } from "@/lib/route-helpers";

export const Route = createFileRoute("/movie/$slug")({
  validateSearch: validateTab,
  head: ({ params }) => titleHead("movie", params.slug),
  component: MoviePage,
});

function MoviePage() {
  const { slug } = Route.useParams();
  const { tab } = Route.useSearch();
  return <TitlePage kind="movie" slug={slug} tab={tab ?? "lessons"} />;
}
