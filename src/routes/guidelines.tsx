import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/bits";

export const Route = createFileRoute("/guidelines")({
  head: () => ({
    meta: [
      { title: "Guidelines, privacy & terms — Inktella" },
      { name: "description", content: "How we keep Inktella kind: community guidelines, copyright and takedowns, privacy and terms." },
      { property: "og:title", content: "Guidelines, privacy & terms — Inktella" },
      { property: "og:description", content: "Community guidelines, copyright, privacy and terms for Inktella." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Guidelines,
});

function S({ h, children }: { h: string; children: React.ReactNode }) {
  return (
    <section className="border-b py-6">
      <h2 className="text-2xl">{h}</h2>
      <div className="mt-2 space-y-2 leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function Guidelines() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="How we keep it kind" sub="Short version: be generous, mark spoilers, and keep quotes short." />
      <div id="community-guidelines">
        <S h="Community guidelines">
          <p>Share what stayed with you. Disagree with ideas, never with people. No harassment, hate, spam or self-promotion.</p>
          <p>Mark anything that reveals plot as a spoiler. Spoilers are hidden until a reader chooses to see them.</p>
        </S>
      </div>
      <S h="Quotes & copyright">
        <p>Movie and series dialogue belongs to its creators. Quote a line or two at most — never post scripts, long passages or full scenes.</p>
        <p>Copyright owners can request removal by reporting the post with the reason “copyright” or by writing to copyright@inktella.app with the link, the work concerned and proof of ownership. We review takedown requests promptly and notify the poster.</p>
      </S>
      <div id="privacy">
        <S h="Privacy">
          <p>We store your profile, what you post, and your library to run the service. We never sell your data. You can delete your account and everything you've shared at any time from Settings.</p>
        </S>
      </div>
      <div id="terms">
        <S h="Terms">
          <p>You keep ownership of what you write and grant Inktella permission to display it. We may remove content or restrict accounts that break these guidelines.</p>
        </S>
      </div>
    </div>
  );
}
