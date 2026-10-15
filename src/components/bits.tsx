import { Link } from "@tanstack/react-router";
import { formatDistanceToNowStrict, format } from "date-fns";
import { useState, type CSSProperties, type ReactNode } from "react";
import { EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { titlePath } from "@/lib/store";
import type { Title, User } from "@/lib/types";

export function Poster({ title, className, size = "md" }: { title: Pick<Title, "name" | "year" | "hue" | "kind">; className?: string; size?: "xs" | "sm" | "md" | "lg" }) {
  const text = { xs: "text-[9px]", sm: "text-sm", md: "text-lg", lg: "text-3xl" }[size];
  return (
    <div
      className={cn("poster relative flex aspect-[2/3] flex-col justify-end overflow-hidden rounded-md p-[8%]", className)}
      style={{ "--h": title.hue } as CSSProperties}
      aria-hidden
    >
      {size !== "xs" && (
        <>
          <span className="absolute left-[8%] top-[6%] text-[10px] uppercase tracking-[0.2em] opacity-60">{title.kind}</span>
          <span className={cn("font-display leading-[1.05]", text)}>{title.name}</span>
          <span className="mt-1 text-[10px] opacity-60">{title.year}</span>
        </>
      )}
    </div>
  );
}

export function Avatar({ user, size = 36 }: { user: Pick<User, "displayName" | "username"> | undefined; size?: number }) {
  const name = user?.displayName ?? "?";
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  let h = 0;
  for (const c of user?.username ?? "") h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span
      className="avatar-tone inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium"
      style={{ "--h": h, width: size, height: size, fontSize: size * 0.38 } as CSSProperties}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function TimeAgo({ iso }: { iso: string }) {
  const date = new Date(iso);
  return (
    <time dateTime={iso} title={format(date, "PPpp")} suppressHydrationWarning className="text-subtle">
      {formatDistanceToNowStrict(date, { addSuffix: false })}
    </time>
  );
}

export function UserLink({ user, className }: { user?: User; className?: string }) {
  if (!user) return <span className={className}>Former member</span>;
  return (
    <Link to="/u/$username" params={{ username: user.username }} className={cn("font-medium hover:underline", className)}>
      {user.displayName}
    </Link>
  );
}

export function TitleLink({ title, className, children }: { title: Title; className?: string; children?: ReactNode }) {
  return (
    <Link to={titlePath(title)} params={{ slug: title.slug }} className={className}>
      {children ?? title.name}
    </Link>
  );
}

export function Spoiler({ active, children, label = "Contains spoilers" }: { active: boolean; children: ReactNode; label?: string }) {
  const [shown, setShown] = useState(false);
  if (!active || shown) return <>{children}</>;
  return (
    <div className="relative">
      <div className="spoiler-veil" aria-hidden>{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <button
          onClick={() => setShown(true)}
          className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <EyeOff className="size-3.5" /> {label} · Reveal
        </button>
      </div>
    </div>
  );
}

export function EpisodeTag({ season, episode }: { season?: number; episode?: number }) {
  if (!season && !episode) return null;
  return (
    <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
      {season ? `S${season}` : ""}{episode ? `E${episode}` : ""}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-16 text-center font-display text-xl text-muted-foreground">{children}</p>;
}

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="mb-6 pt-6 md:pt-10">
      <h1 className="text-4xl md:text-5xl">{title}</h1>
      {sub && <p className="mt-2 text-muted-foreground">{sub}</p>}
    </header>
  );
}

export function useCursor<T>(items: T[], pageSize = 10) {
  const [count, setCount] = useState(pageSize);
  return { visible: items.slice(0, count), hasMore: items.length > count, more: () => setCount((c) => c + pageSize) };
}

export function LoadMore({ show, onClick }: { show: boolean; onClick: () => void }) {
  if (!show) return null;
  return (
    <div className="py-6 text-center">
      <button onClick={onClick} className="rounded-full border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Load more</button>
    </div>
  );
}
