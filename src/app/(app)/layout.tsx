import Link from "next/link";
import { DiveReminder } from "@/components/DiveReminder";
import { Nav } from "@/components/Nav";
import { requireSession } from "@/lib/auth";
import { todayUtc } from "@/lib/week";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await requireSession();
  const { data: todays } = await supabase
    .from("krillion_scores")
    .select("id")
    .eq("user_id", user.id)
    .eq("played_on", todayUtc())
    .limit(1);
  const playedToday = (todays?.length ?? 0) > 0;

  return (
    <>
      <Nav profile={profile} />
      <DiveReminder playedToday={playedToday} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="py-6 text-center text-xs text-mist/60">
        Game days follow UTC, just like Krillion&apos;s daily reset. 1 point = 10 metres of depth.{" "}
        <Link href="/reset-password" className="hover:text-aqua hover:underline">
          Change password
        </Link>
      </footer>
    </>
  );
}
