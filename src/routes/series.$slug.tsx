import { createFileRoute } from "@tanstack/react-router";
import { TitlePage } from "@/components/TitlePage";
import { titleHead, validateTab } from "@/lib/route-helpers";

export const Route = createFileRoute("/series/$slug")({
  validateSearch: validateTab,
  head: ({ params }) => titleHead("series", params.slug),
  component: SeriesPage,
});

function SeriesPage() {
  const { slug } = Route.useParams();
  const { tab } = Route.useSearch();
  return <TitlePage kind="series" slug={slug} tab={tab ?? "lessons"} />;
}
