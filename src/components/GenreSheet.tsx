import { useMemo, useState } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { titlePath, useDB } from "@/lib/store";
import type { Kind, Title } from "@/lib/types";
import { Poster } from "./bits";
import { Link } from "@tanstack/react-router";

const descriptions: Record<string, string> = {
  Action: "High-stakes stories driven by momentum, daring choices, and physical spectacle.",
  Comedy: "Light-hearted stories built around wit, timing, and the wonderfully messy parts of life.",
  Drama: "Character-led stories that explore difficult choices, relationships, and emotional change.",
  Romance: "Stories about connection, longing, and the many ways people find their way to one another.",
  Thriller: "Tense, propulsive stories that keep questions hanging until the very last scene.",
  Horror: "Unsettling stories that turn fear, atmosphere, and the unknown into the main event.",
  Documentary: "Non-fiction stories that look closer at real people, places, and ideas.",
  "Science Fiction": "Speculative stories that use strange worlds and future possibilities to ask human questions.",
  Fantasy: "Stories where myth, magic, and impossible worlds make new kinds of truth possible.",
};

type RecommendationFilter = "all" | "recommended";

function recommendationScore(title: Title, votes: ReturnType<typeof useDB>["recommendations"]) {
  const titleVotes = votes.filter((vote) => vote.titleId === title.id);
  if (titleVotes.length === 0) return 0;
  return titleVotes.filter((vote) => vote.value === "yes").length / titleVotes.length;
}

export function GenreSheet({ genre, open, onClose }: { genre: string; open: boolean; onClose: () => void }) {
  const db = useDB();
  const [kind, setKind] = useState<Kind | "all">("all");
  const [filter, setFilter] = useState<RecommendationFilter>("all");

  const titles = useMemo(() => {
    const filtered = db.titles
      .filter((title) => title.status === "published" && title.genres.some((item) => item.toLowerCase() === genre.toLowerCase()))
      .filter((title) => kind === "all" || title.kind === kind)
      .filter((title) => filter === "all" || recommendationScore(title, db.recommendations) >= 0.7)
      .sort((a, b) => recommendationScore(b, db.recommendations) - recommendationScore(a, db.recommendations));

    return filtered;
  }, [db.titles, db.recommendations, genre, kind, filter]);

  return (
    <Drawer open={open} onOpenChange={(value) => !value && onClose()}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="mx-auto w-full max-w-2xl px-4 text-left">
          <DrawerTitle className="font-display text-3xl">{genre}</DrawerTitle>
          <DrawerDescription className="max-w-xl text-sm leading-6">
            {descriptions[genre] ?? `Explore ${genre.toLowerCase()} stories from the Inktella community.`}
          </DrawerDescription>
        </DrawerHeader>

        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 overflow-y-auto px-4 pb-10">
          <div className="flex flex-col gap-3 border-y py-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <Sparkles className="size-3.5" /> Recometer
            </div>
            <ToggleGroup type="single" value={filter} onValueChange={(value) => value && setFilter(value as RecommendationFilter)} className="justify-start">
              <ToggleGroupItem value="all" aria-label="Show all titles">All</ToggleGroupItem>
              <ToggleGroupItem value="recommended" aria-label="Show highly recommended titles">Highly recommended</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <Tabs value={kind} onValueChange={(value) => setKind(value as Kind | "all")}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="movie">Movies</TabsTrigger>
              <TabsTrigger value="series">Series</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col gap-1">
            {titles.length === 0 ? (
              <p className="py-10 text-center font-display text-xl text-muted-foreground">Nothing here yet.</p>
            ) : titles.map((title) => (
              <Link
                key={title.id}
                to={titlePath(title)}
                params={{ slug: title.slug }}
                onClick={onClose}
                className="group flex gap-4 rounded-lg py-3 transition-colors hover:bg-muted/60"
              >
                <Poster title={title} size="sm" className="w-20 shrink-0" />
                <span className="min-w-0 py-1">
                  <span className="flex items-start justify-between gap-2">
                    <span>
                      <span className="block font-display text-2xl leading-none">{title.name}</span>
                      <span className="mt-1 block text-xs uppercase tracking-[0.14em] text-muted-foreground">{title.kind} · {title.year}</span>
                    </span>
                    <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-2 line-clamp-2 block text-sm leading-5 text-muted-foreground">{title.synopsis}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
