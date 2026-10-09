import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { KRILLION_URL } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import { Avatar, Nick } from "./ui";
import { Logo } from "./Logo";
import { NavMenu } from "./NavMenu";

const MENU_ITEM = "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left font-display font-semibold hover:bg-white/10";

export function Nav({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-deep/70 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Logo href="/dashboard" compact />
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <a href={KRILLION_URL} target="_blank" rel="noreferrer" className="btn-aqua btn-sm" title="Open Krillion in a new tab">
            <span>
              Play<span className="hidden min-[360px]:inline"> Krillion</span> ↗
            </span>
          </a>
          <Link href="/dashboard" className="btn-ghost btn-sm hidden md:inline-flex">
            Dashboard
          </Link>
          {profile.is_admin ? (
            <Link href="/admin" className="btn-ghost btn-sm hidden md:inline-flex">
              Admin
            </Link>
          ) : null}
          <span className="chip hidden items-center gap-2 lg:inline-flex">
            <Avatar name={profile.display_name} size="sm" />
            <Nick nick={profile.display_name} name={profile.full_name} />
          </span>
          <form action={signOut} className="hidden md:block">
            <button type="submit" className="btn-ghost btn-sm" title="Sign out">
              Sign out
            </button>
          </form>

          <NavMenu className="md:hidden">
            <div className="flex items-center gap-3 border-b border-white/10 px-3 pt-2 pb-3">
              <Avatar name={profile.display_name} />
              <div className="min-w-0">
                <div className="heading truncate">{profile.display_name}</div>
                {profile.full_name ? <div className="truncate text-xs text-mist">{profile.full_name}</div> : null}
              </div>
            </div>
            <div className="pt-1">
              <Link href="/dashboard" className={MENU_ITEM}>
                Dashboard
              </Link>
              {profile.is_admin ? (
                <Link href="/admin" className={MENU_ITEM}>
                  Admin
                </Link>
              ) : null}
              <form action={signOut}>
                <button type="submit" className={`${MENU_ITEM} text-mist`}>
                  Sign out
                </button>
              </form>
            </div>
          </NavMenu>
        </nav>
      </div>
    </header>
  );
}
