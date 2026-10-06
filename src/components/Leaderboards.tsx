import { MAX_DAILY_SCORE } from "@/lib/constants";
import {
  depthMetres,
  formatMetres,
  isFullDepth,
  medal,
  streakFlames,
  streakTitle,
  type BestDive,
  type GridRow,
  type StreakEntry,
  type WeeklyTotal,
} from "@/lib/stats";
import { formatShort, weekdayShort } from "@/lib/week";
import { Avatar, DepthBar, EmptyState } from "./ui";

const PODIUM_STYLES = [
  "from-sun/30 to-sun/5 border-sun/40 shadow-[0_0_40px_-10px_rgba(255,209,102,0.5)]",
  "from-silver/25 to-silver/5 border-silver/30",
  "from-bronze/25 to-bronze/5 border-bronze/30",
];

export function Podium({ entries }: { entries: WeeklyTotal[] }) {
  const top = entries.filter((e) => e.dives > 0).slice(0, 3);
  if (top.length === 0) {
    return <EmptyState emoji="🏝️">Nobody has dived this week yet. Be the first splash.</EmptyState>;
  }
  // Classic podium order: 2nd, 1st, 3rd
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
  const rankOf = (e: WeeklyTotal) => top.indexOf(e);
  return (
    <div className={`grid gap-3 ${order.length === 3 ? "sm:grid-cols-3 sm:items-end" : order.length === 2 ? "sm:grid-cols-2" : ""}`}>
      {order.map((e) => {
        const rank = rankOf(e);
        return (
          <div
            key={e.member.id}
            className={`animate-pop rounded-3xl border bg-gradient-to-b p-5 text-center ${PODIUM_STYLES[rank]} ${
              rank === 0 ? "order-first sm:order-none sm:py-8" : rank === 1 ? "sm:py-6" : ""
            }`}
          >
            <div className="text-4xl">{medal(rank)}</div>
            <div className="mt-2 flex justify-center">
              <Avatar name={e.member.display_name} size="lg" />
            </div>
            <div className="heading mt-2 truncate text-xl">{e.member.display_name}</div>
            <div className="heading mt-1 text-4xl">{e.total}</div>
            <div className="text-xs text-mist">
              {e.dives} dive{e.dives === 1 ? "" : "s"} · avg {e.average} · {formatMetres(depthMetres(e.total))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TotalsList({ entries }: { entries: WeeklyTotal[] }) {
  const max = Math.max(1, ...entries.map((e) => e.total));
  return (
    <ol className="space-y-3">
      {entries.map((e, i) => (
        <li key={e.member.id} className="flex items-center gap-3">
          <span className="w-8 shrink-0 text-center font-display text-lg font-bold text-mist">{medal(i)}</span>
          <Avatar name={e.member.display_name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-display font-semibold">{e.member.display_name}</span>
              <span className="font-display text-lg font-bold">{e.total}</span>
            </div>
            <DepthBar value={e.total} max={max} color={i === 0 ? "from-sun to-krill-light" : undefined} />
            <div className="mt-1 text-xs text-mist">
              {e.dives === 0 ? "Hasn't dived this week" : `${e.dives} dive${e.dives === 1 ? "" : "s"} · avg ${e.average} · best ${e.best}`}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function BestDiveList({ entries, showDate = true }: { entries: BestDive[]; showDate?: boolean }) {
  if (entries.length === 0) {
    return <EmptyState>No dives logged yet.</EmptyState>;
  }
  return (
    <ol className="space-y-3">
      {entries.map((e, i) => (
        <li key={e.member.id} className="flex items-center gap-3">
          <span className="w-8 shrink-0 text-center font-display text-lg font-bold text-mist">{medal(i)}</span>
          <Avatar name={e.member.display_name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-display font-semibold">
                {e.member.display_name}
                {isFullDepth(e.score) ? <span title="Perfect day"> 💎</span> : null}
              </span>
              <span className="font-display text-lg font-bold">{e.score}</span>
            </div>
            <DepthBar value={e.score} max={MAX_DAILY_SCORE} color={i === 0 ? "from-sun to-krill-light" : undefined} />
            <div className="mt-1 flex justify-between gap-2 text-xs text-mist">
              <span>
                {showDate ? `${formatShort(e.played_on)} · ` : ""}
                {formatMetres(depthMetres(e.score))}
              </span>
              {e.note ? <span className="truncate italic">“{e.note}”</span> : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function StreakList({ entries }: { entries: StreakEntry[] }) {
  const hot = entries.filter((e) => e.current > 0);
  if (hot.length === 0) {
    return <EmptyState emoji="🧊">Nobody is on a streak. Everyone is on dry land.</EmptyState>;
  }
  return (
    <ol className="space-y-2">
      {entries.map((e, i) => (
        <li
          key={e.member.id}
          className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${
            i === 0 && e.current >= 3 ? "border border-krill/40 bg-krill/10" : "bg-white/5"
          }`}
        >
          <Avatar name={e.member.display_name} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display font-semibold">{e.member.display_name}</div>
            <div className="text-xs text-mist">
              {streakTitle(e.current)} · longest ever {e.longest}
              {e.playedToday ? " · dived today ✅" : e.current > 0 ? " · not yet today ⏳" : ""}
            </div>
          </div>
          <div className="text-right">
            <div className="heading text-2xl">{e.current}</div>
            <div className="text-sm leading-none">{streakFlames(e.current)}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function WeekGridTable({ rows, days, today }: { rows: GridRow[]; days: string[]; today: string }) {
  if (rows.length === 0) return <EmptyState>No members on this board yet.</EmptyState>;
  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <table className="w-full min-w-[560px] border-separate border-spacing-y-1 text-sm">
        <thead>
          <tr className="text-xs text-mist">
            <th className="text-left font-semibold">Diver</th>
            {days.map((d) => (
              <th key={d} className={`px-1 text-center font-semibold ${d === today ? "text-aqua" : ""}`}>
                {weekdayShort(d)}
                <div className="text-[10px] font-normal opacity-70">{formatShort(d)}</div>
              </th>
            ))}
            <th className="text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.member.id}>
              <td className="rounded-l-xl bg-white/5 py-2 pl-2 pr-3">
                <span className="flex items-center gap-2">
                  <Avatar name={r.member.display_name} size="sm" />
                  <span className="truncate font-display font-semibold">{r.member.display_name}</span>
                </span>
              </td>
              {r.cells.map((c, i) => (
                <td key={i} className={`bg-white/5 px-1 text-center ${days[i] === today ? "bg-aqua/10" : ""}`}>
                  {c === null ? (
                    <span className="text-mist/40">·</span>
                  ) : (
                    <span
                      className={`inline-block min-w-10 rounded-lg px-1.5 py-0.5 font-display font-bold ${heat(c)}`}
                      title={formatMetres(depthMetres(c))}
                    >
                      {c}
                    </span>
                  )}
                </td>
              ))}
              <td className="rounded-r-xl bg-white/5 pr-2 text-right font-display text-base font-bold">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function heat(score: number): string {
  if (score >= MAX_DAILY_SCORE) return "bg-sun text-abyss";
  if (score >= 550) return "bg-aqua text-abyss";
  if (score >= 400) return "bg-aqua/60 text-abyss";
  if (score >= 250) return "bg-aqua/30 text-foam";
  return "bg-white/10 text-foam";
}
