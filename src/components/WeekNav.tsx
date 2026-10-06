import Link from "next/link";
import { addDays, weekLabel } from "@/lib/week";

export function WeekNav({ boardId, start, thisWeek }: { boardId: string; start: string; thisWeek: string }) {
  const prev = addDays(start, -7);
  const next = addDays(start, 7);
  const isCurrent = start === thisWeek;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={`/boards/${boardId}?w=${prev}`} className="btn-ghost btn-sm" aria-label="Previous week">
        ←
      </Link>
      <span className="chip text-sm">{weekLabel(start)}</span>
      {isCurrent ? (
        <span className="btn-ghost btn-sm pointer-events-none opacity-40" aria-disabled>
          →
        </span>
      ) : (
        <Link href={`/boards/${boardId}?w=${next}`} className="btn-ghost btn-sm" aria-label="Next week">
          →
        </Link>
      )}
      {!isCurrent ? (
        <Link href={`/boards/${boardId}`} className="btn-aqua btn-sm">
          This week
        </Link>
      ) : null}
    </div>
  );
}
