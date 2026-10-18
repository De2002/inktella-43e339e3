import { useState } from "react";
import {
  Clapperboard,
  Lightbulb,
  Mail,
  MessageCircleQuestion,
  MessageSquare,
  PenLine,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { TabConfig } from "@/lib/tabs";
import type { Title } from "@/lib/types";
import { Composer } from "./Composer";

const icons = {
  lessons: Lightbulb,
  quotes: Quote,
  reviews: PenLine,
  questions: MessageCircleQuestion,
  moments: Clapperboard,
  director: Mail,
} as const;

export function FloatingComposer({ title, tab }: { title: Title; tab: TabConfig }) {
  const [open, setOpen] = useState(false);
  const Icon = icons[tab.key as keyof typeof icons] ?? MessageSquare;

  if (!tab.category && tab.key !== "reviews" && tab.key !== "questions") return null;

  return (
    <>
      <Button
        type="button"
        size="icon"
        aria-label={`Share a ${tab.label.toLowerCase()}`}
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 size-12 rounded-full shadow-lg md:bottom-6 md:right-6"
      >
        <Icon aria-hidden="true" />
      </Button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent forceMount className="max-h-[92vh]">
          <DrawerHeader className="mx-auto w-full max-w-2xl px-4 text-left">
            <DrawerTitle className="font-display text-2xl">Share to {tab.label}</DrawerTitle>
            <DrawerDescription>{tab.placeholder(title.kind)}</DrawerDescription>
          </DrawerHeader>
          <div className="mx-auto w-full max-w-2xl overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <Composer title={title} tab={tab} />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
