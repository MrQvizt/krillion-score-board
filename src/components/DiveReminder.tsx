import Link from "next/link";
import { KRILLION_URL } from "@/lib/constants";

/** Shown under the top bar on every app page until today's dive is logged. */
export function DiveReminder({ playedToday }: { playedToday: boolean }) {
  if (playedToday) return null;
  return (
    <div className="border-b border-sun/30 bg-sun/10">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm sm:px-6">
        <p>
          <span aria-hidden>🤿</span> You haven&apos;t dived today. Play, then log your score before the UTC reset to keep your streak.
        </p>
        <span className="flex flex-wrap items-center gap-2">
          <a href={KRILLION_URL} target="_blank" rel="noreferrer" className="btn-primary btn-sm">
            Play today&apos;s Krillion ↗
          </a>
          <Link href="/dashboard" className="btn-ghost btn-sm">
            Log a score
          </Link>
        </span>
      </div>
    </div>
  );
}
