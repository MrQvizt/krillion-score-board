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
import { formatShort, parseDate, weekdayShort } from "@/lib/week";
import { Avatar, DepthBar, EmptyState, Nick } from "./ui";

const PODIUM_STYLES = [
  "from-sun/30 to-sun/5 border-sun/40 shadow-[0_0_40px_-10px_rgba(255,209,102,0.5)]",
  "from-silver/25 to-silver/5 border-silver/30",
  "from-bronze/25 to-bronze/5 border-bronze/30",
];

type PodiumEntry = {
  key: string;
  nick: string;
  name?: string | null;
  value: number;
  detail: React.ReactNode;
};

/**
 * Three cards in classic podium order (2nd, 1st, 3rd). On phones they are
 * compact rows, 1st first, so the podium does not fill several screens.
 */
function PodiumCards({ entries }: { entries: PodiumEntry[] }) {
  const top = entries.slice(0, 3);
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
  const rankOf = (e: PodiumEntry) => top.indexOf(e);
  return (
    <div
      className={`grid grid-cols-1 gap-3 ${order.length === 3 ? "sm:grid-cols-3 sm:items-end" : order.length === 2 ? "sm:grid-cols-2" : ""}`}
    >
      {order.map((e) => {
        const rank = rankOf(e);
        return (
          <div
            key={e.key}
            className={`animate-pop flex min-w-0 items-center gap-3 rounded-3xl border bg-gradient-to-b px-4 py-3 sm:flex-col sm:gap-0 sm:p-5 sm:text-center ${PODIUM_STYLES[rank]} ${
              rank === 0 ? "order-first sm:order-none sm:py-8" : rank === 1 ? "sm:py-6" : ""
            }`}
          >
            <div className="text-2xl sm:text-4xl">{medal(rank)}</div>
            <span className="hidden sm:mt-2 sm:block">
              <Avatar name={e.nick} size="lg" />
            </span>
            {/* One block beside the score on phones; its lines join the centred column from sm up. */}
            <div className="min-w-0 flex-1 sm:contents">
              <div className="heading truncate text-lg sm:order-1 sm:mt-2 sm:w-full sm:text-xl">
                <Nick nick={e.nick} name={e.name} />
              </div>
              <div className="text-xs text-mist sm:order-3 sm:w-full">{e.detail}</div>
            </div>
            <div className="heading text-2xl sm:order-2 sm:mt-1 sm:text-4xl">{e.value}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Weekly podium: biggest total this week among divers who have dived. */
export function Podium({ entries }: { entries: WeeklyTotal[] }) {
  const top = entries.filter((e) => e.dives > 0).slice(0, 3);
  if (top.length === 0) {
    return <EmptyState emoji="🏝️">Nobody has dived this week yet. Be the first splash.</EmptyState>;
  }
  return (
    <PodiumCards
      entries={top.map((e) => ({
        key: e.member.id,
        nick: e.member.display_name,
        name: e.member.full_name,
        value: e.total,
        detail: `${e.dives} dive${e.dives === 1 ? "" : "s"} · avg ${e.average} · ${formatMetres(depthMetres(e.total))}`,
      }))}
    />
  );
}

/** Daily podium: today's best dives. */
export function DailyPodium({ entries }: { entries: BestDive[] }) {
  const top = entries.slice(0, 3);
  if (top.length === 0) {
    return <EmptyState emoji="🌅">Nobody has dived today yet. Play, log your score, and own the top spot.</EmptyState>;
  }
  return (
    <PodiumCards
      entries={top.map((e) => ({
        key: e.member.id,
        nick: e.member.display_name,
        name: e.member.full_name,
        value: e.score,
        detail: (
          <>
            {formatMetres(depthMetres(e.score))}
            {isFullDepth(e.score) ? " · 💎 perfect" : ""}
            {e.note ? <span className="block truncate italic">“{e.note}”</span> : null}
          </>
        ),
      }))}
    />
  );
}

export function TotalsList({
  entries,
  offset = 0,
  scaleMax,
}: {
  entries: WeeklyTotal[];
  offset?: number;
  scaleMax?: number;
}) {
  const max = Math.max(1, scaleMax ?? 0, ...entries.map((e) => e.total));
  return (
    <ol className="space-y-3">
      {entries.map((e, i) => (
        <li key={e.member.id} className="flex items-center gap-3">
          <span className="w-8 shrink-0 text-center font-display text-lg font-bold text-mist">{medal(i + offset)}</span>
          <Avatar name={e.member.display_name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-display font-semibold">
                <Nick nick={e.member.display_name} name={e.member.full_name} />
              </span>
              <span className="font-display text-lg font-bold">{e.total}</span>
            </div>
            <DepthBar value={e.total} max={max} color={i + offset === 0 ? "from-sun to-krill-light" : undefined} />
            <div className="mt-1 text-xs text-mist">
              {e.dives === 0 ? "Hasn't dived this week" : `${e.dives} dive${e.dives === 1 ? "" : "s"} · avg ${e.average} · best ${e.best}`}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Ranked single dives. `offset` is the rank of the first entry (3 when the list continues under a podium). */
export function BestDiveList({
  entries,
  showDate = true,
  offset = 0,
}: {
  entries: BestDive[];
  showDate?: boolean;
  offset?: number;
}) {
  if (entries.length === 0) {
    return <EmptyState>No dives logged yet.</EmptyState>;
  }
  return (
    <ol className="space-y-3">
      {entries.map((e, i) => (
        <li key={e.member.id} className="flex items-center gap-3">
          <span className="w-8 shrink-0 text-center font-display text-lg font-bold text-mist">{medal(i + offset)}</span>
          <Avatar name={e.member.display_name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-display font-semibold">
                <Nick nick={e.member.display_name} name={e.member.full_name} />
                {isFullDepth(e.score) ? <span title="Perfect day"> 💎</span> : null}
              </span>
              <span className="font-display text-lg font-bold">{e.score}</span>
            </div>
            <DepthBar value={e.score} max={MAX_DAILY_SCORE} color={i + offset === 0 ? "from-sun to-krill-light" : undefined} />
            <div className="mt-1 flex justify-between gap-2 text-xs text-mist">
              <span className="shrink-0">
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
            <div className="truncate font-display font-semibold">
              <Nick nick={e.member.display_name} name={e.member.full_name} />
            </div>
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
    <>
      {/* Phones: one card per diver with the week as a strip of seven, so nothing scrolls sideways. */}
      <div className="md:hidden">
        <div className="grid grid-cols-7 gap-1 px-3 pb-1 text-center text-[10px] text-mist">
          {days.map((d) => (
            <div key={d} className={d === today ? "font-bold text-aqua" : ""}>
              {weekdayShort(d)}
              <div className="opacity-70">{parseDate(d).getUTCDate()}</div>
            </div>
          ))}
        </div>
        <ol className="space-y-2">
          {rows.map((r) => (
            <li key={r.member.id} className="rounded-2xl bg-white/5 p-3">
              <div className="flex items-center gap-2">
                <Avatar name={r.member.display_name} size="sm" />
                <span className="min-w-0 flex-1 truncate font-display font-semibold">
                  <Nick nick={r.member.display_name} name={r.member.full_name} />
                </span>
                <span className="font-display text-base font-bold">{r.total}</span>
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs">
                {r.cells.map((c, i) => (
                  <div key={i} className={`rounded-lg py-0.5 ${days[i] === today ? "bg-aqua/10" : ""}`}>
                    {c === null ? (
                      <span className="text-mist/40">·</span>
                    ) : (
                      <span
                        className={`block rounded-md py-0.5 font-display font-bold ${heat(c)}`}
                        title={`${weekdayShort(days[i])} ${formatShort(days[i])}: ${formatMetres(depthMetres(c))}`}
                      >
                        {c}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="-mx-2 hidden overflow-x-auto px-2 md:block">
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
                    <span className="truncate font-display font-semibold">
                      <Nick nick={r.member.display_name} name={r.member.full_name} />
                    </span>
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
    </>
  );
}

function heat(score: number): string {
  if (score >= MAX_DAILY_SCORE) return "bg-sun text-abyss";
  if (score >= 550) return "bg-aqua text-abyss";
  if (score >= 400) return "bg-aqua/60 text-abyss";
  if (score >= 250) return "bg-aqua/30 text-foam";
  return "bg-white/10 text-foam";
}
