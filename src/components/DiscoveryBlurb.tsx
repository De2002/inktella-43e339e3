import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Poster, TitleLink } from "@/components/bits";
import { useCurrentUser, useDB } from "@/lib/store";
import type { Title } from "@/lib/types";

export function DiscoveryBlurb({ title }: { title: Title }) {
  const db = useDB();
  const user = useCurrentUser();
  const [tagId, setTagId] = useState<string | null>(null);
  const links = useMemo(() => db.intentLinks.filter((link) => link.titleId === title.id && link.approvalStatus === "approved").sort((a, b) => a.startOffset - b.startOffset), [db.intentLinks, title.id]);
  const canDiscover = Boolean(user?.isPro);
  const parts = useMemo(() => {
    if (!canDiscover || !links.length) return [{ text: title.synopsis }];
    const result: { text: string; tagId?: string }[] = [];
    let cursor = 0;
    for (const link of links.slice(0, 2)) {
      const index = title.synopsis.indexOf(link.selectedPhrase, cursor);
      if (index < 0 || index < cursor) continue;
      if (index > cursor) result.push({ text: title.synopsis.slice(cursor, index) });
      result.push({ text: link.selectedPhrase, tagId: link.tagId });
      cursor = index + link.selectedPhrase.length;
    }
    result.push({ text: title.synopsis.slice(cursor) });
    return result;
  }, [canDiscover, links, title.synopsis]);
  const activeTag = tagId ? db.discoveryTags.find((tag) => tag.id === tagId) : undefined;
  const results = useMemo(() => {
    if (!activeTag) return [];

    // A title can be connected to a discovery tag through the explicit catalog
    // assignment or through another approved intent link. Supporting both keeps
    // the sheet aligned with the same internal tag set used by admin discovery.
    const matchingTitleIds = new Set(
      db.titleDiscoveryTags
        .filter((item) => item.tagId === activeTag.id && item.titleId !== title.id)
        .map((item) => item.titleId),
    );
    for (const link of db.intentLinks) {
      if (link.tagId === activeTag.id && link.approvalStatus === "approved" && link.titleId !== title.id) {
        matchingTitleIds.add(link.titleId);
      }
    }

    return db.titles.filter(
      (candidate) => matchingTitleIds.has(candidate.id) && candidate.status === "published",
    );
  }, [activeTag, db.intentLinks, db.titleDiscoveryTags, db.titles, title.id]);
  return (
    <>
      <p className="mt-5 leading-relaxed">
        {parts.map((part, index) => part.tagId ? <button key={`${part.tagId}-${index}`} type="button" onClick={() => setTagId(part.tagId!)} className="rounded-sm text-left underline decoration-primary/50 underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{part.text}</button> : <span key={`${part.text}-${index}`}>{part.text}</span>)}
      </p>
      <Drawer open={Boolean(activeTag)} onOpenChange={(open) => !open && setTagId(null)}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="mx-auto w-full max-w-2xl px-4 pb-2">
            <DrawerTitle>{activeTag?.name}</DrawerTitle>
            <DrawerDescription>{activeTag?.description ?? "Discover related movies and series."}</DrawerDescription>
          </DrawerHeader>
          <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-3 overflow-y-auto px-4 pb-8 pt-2 sm:grid-cols-3">
            {results.length > 0 ? results.map((candidate) => <TitleLink key={candidate.id} title={candidate} className="group flex flex-col gap-2"><Poster title={candidate} size="md" className="w-full transition-transform group-hover:-translate-y-1" /><span className="text-sm font-medium">{candidate.name}</span><span className="text-xs text-muted-foreground">{candidate.year} · {candidate.kind}</span></TitleLink>) : <p className="col-span-full py-8 text-center text-sm text-muted-foreground">More stories will appear here as the catalog grows.</p>}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
