import type { Kind, PostCategory } from "./types";

export type TabKey = "lessons" | "quotes" | "reviews" | "questions" | "moments" | "trailer";

export interface TabConfig {
  key: TabKey;
  label: string;
  category?: PostCategory;
  placeholder: (kind: Kind) => string;
  empty: (kind: Kind) => string;
}

const w = (k: Kind) => (k === "movie" ? "movie" : "series");

export const TABS: TabConfig[] = [
  { key: "lessons", label: "Lessons", category: "lesson", placeholder: (k) => `What did this ${w(k)} teach you?`, empty: (k) => `No lessons yet. What did this ${w(k)} leave you with?` },
  { key: "quotes", label: "Quotes", category: "quote", placeholder: () => "What quote stayed with you?", empty: () => "No quotes yet. Share a line you still hear." },
  { key: "reviews", label: "Reviews", placeholder: (k) => `What did you think of this ${w(k)}?`, empty: () => "No reviews yet. You don't have to be a critic." },
  { key: "questions", label: "Questions", placeholder: (k) => `What would you like to ask about this ${w(k)}?`, empty: () => "No questions yet. Curious about something?" },
  { key: "moments", label: "Moments", category: "moment", placeholder: () => "Which moment stayed with you?", empty: () => "No moments yet. Which scene do you keep thinking about?" },
  { key: "trailer", label: "Trailer", category: "trailer_thought", placeholder: () => "What do you think of the trailer?", empty: () => "No trailer thoughts yet. First impressions welcome." },
];

export const categoryLabel: Record<PostCategory, string> = {
  lesson: "Lesson",
  quote: "Quote",
  moment: "Moment",
  trailer_thought: "Trailer",
};
