import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Compass, Home, Library, Search, User as UserIcon, Layers } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { signOut, useCurrentUser } from "@/lib/store";
import { Avatar } from "./bits";
import { SearchBox } from "./SearchBox";

const ACCOUNT_URL = "https://accounts.inktella.com";

function Logo() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 font-display text-2xl tracking-tight"
      aria-label="Inktella home"
    >
      <img
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/file_00000000fee0820b9c46a626c78afbbc-vO7JQqQ4S3FbFMJRYVNELjCd1Q19cV.png"
        alt=""
        className="size-8 rounded-md object-cover"
      />
      inktella<span className="text-like">.</span>
    </Link>
  );
}

function AccountArea() {
  const me = useCurrentUser();
  const navigate = useNavigate();
  if (!me)
    return (
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm">
          <a href={`${ACCOUNT_URL}/sign-in`}>Sign in</a>
        </Button>
        <Button asChild size="sm" className="rounded-full">
          <a href={`${ACCOUNT_URL}/sign-up`}>Get started</a>
        </Button>
      </div>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Account menu" className="rounded-full">
        <Avatar user={me} size={32} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <a href={`${ACCOUNT_URL}/user`}>Profile</a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/library">Library</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">Settings</Link>
        </DropdownMenuItem>
        {me.role === "admin" && (
          <DropdownMenuItem asChild>
            <Link to="/admin">Admin</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            signOut();
            navigate({ to: "/", replace: true });
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const navLink =
  "text-sm text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground";

export function AppShell({ children }: { children: ReactNode }) {
  const me = useCurrentUser();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          <Logo />
          <nav className="hidden items-center gap-5 md:flex" aria-label="Main">
            <Link to="/" className={navLink} activeOptions={{ exact: true }}>
              Home
            </Link>
            <Link to="/explore" className={navLink}>
              Explore
            </Link>
            <Link to="/collections" className={navLink}>
              Collections
            </Link>
          </nav>
          <SearchBox className="ml-auto hidden w-72 md:block" />
          <div className="ml-auto md:ml-0">
            <AccountArea />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-safe md:pb-16">{children}</main>
      <footer className="mx-auto hidden max-w-5xl gap-5 border-t px-4 py-8 text-xs text-subtle md:flex">
        <span>No ratings. Just people sharing what stayed with them.</span>
        <Link to="/guidelines" className="ml-auto hover:text-foreground">
          Guidelines, privacy & terms
        </Link>
      </footer>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5">
          {[
            { to: "/", label: "Home", icon: Home },
            { to: "/explore", label: "Explore", icon: Compass },
            { to: "/search", label: "Search", icon: Search },
            { to: "/collections", label: "Collections", icon: Layers },
          ].map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-subtle [&.active]:text-foreground"
            >
              <Icon className="size-5" strokeWidth={1.6} />
              {label}
            </Link>
          ))}
          {me ? (
            <Link
              to="/library"
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-subtle [&.active]:text-foreground"
            >
              <Library className="size-5" strokeWidth={1.6} /> Profile
            </Link>
          ) : (
            <a
              href={`${ACCOUNT_URL}/sign-in`}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-subtle"
            >
              <UserIcon className="size-5" strokeWidth={1.6} /> Profile
            </a>
          )}
        </div>
      </nav>
    </div>
  );
}
