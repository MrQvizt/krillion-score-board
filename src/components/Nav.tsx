import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { KRILLION_URL } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import { Avatar } from "./ui";
import { Logo } from "./Logo";

export function Nav({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-deep/70 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo href="/dashboard" />
        <nav className="flex items-center gap-1 sm:gap-2">
          <a href={KRILLION_URL} target="_blank" rel="noreferrer" className="btn-aqua btn-sm" title="Open Krillion in a new tab">
            Play Krillion ↗
          </a>
          <Link href="/dashboard" className="btn-ghost btn-sm hidden sm:inline-flex">
            Dashboard
          </Link>
          {profile.is_admin ? (
            <Link href="/admin" className="btn-ghost btn-sm">
              Admin
            </Link>
          ) : null}
          <span className="chip hidden items-center gap-2 sm:inline-flex">
            <Avatar name={profile.display_name} size="sm" />
            {profile.display_name}
          </span>
          <form action={signOut}>
            <button type="submit" className="btn-ghost btn-sm" title="Sign out">
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
