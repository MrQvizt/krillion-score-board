import type { Metadata } from "next";
import Link from "next/link";
import { deleteScore } from "@/app/actions/scores";
import { ScoreForm } from "@/components/ScoreForm";
import { DepthBar, EmptyState, Section, StatTile } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { MAX_DAILY_SCORE } from "@/lib/constants";
import {
  currentStreak,
  depthMetres,
  formatMetres,
  isFullDepth,
  longestStreak,
  streakFlames,
  streakTitle,
} from "@/lib/stats";
import type { Board } from "@/lib/types";
import { formatDayMonth, formatLong, isInWeek, todayUtc, weekStart } from "@/lib/week";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireSession();
  const today = todayUtc();
  const thisWeek = weekStart(today);

  const [{ data: scores }, { data: memberships }] = await Promise.all([
    supabase.from("scores").select("*").eq("user_id", user.id).order("played_on", { ascending: false }),
    supabase.from("board_members").select("board_id").eq("user_id", user.id),
  ]);

  const boardIds = (memberships ?? []).map((m) => m.board_id);
  let boards: Board[] = [];
  if (boardIds.length) {
    const { data } = await supabase.from("boards").select("*").in("id", boardIds).order("name");
    boards = data ?? [];
  }

  const all = scores ?? [];
  const dates = all.map((s) => s.played_on);
  const streak = currentStreak(dates, today);
  const longest = longestStreak(dates);
  const weekScores = all.filter((s) => isInWeek(s.played_on, thisWeek));
  const weekTotal = weekScores.reduce((sum, s) => sum + s.score, 0);
  const weekBest = weekScores.reduce((m, s) => Math.max(m, s.score), 0);
  const allTimeBest = all.reduce((m, s) => Math.max(m, s.score), 0);
  const playedToday = dates.includes(today);

  const existing = Object.fromEntries(all.map((s) => [s.played_on, { score: s.score, note: s.note }]));
  const recent = all.slice(0, 14);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{formatLong(today)}</p>
          <h1 className="heading mt-1 text-4xl sm:text-5xl">
            Ahoy, {profile.display_name} {playedToday ? "🌊" : "👋"}
          </h1>
          <p className="mt-2 text-mist">
            {playedToday
              ? "Today's dive is in the log. Go taunt your friends."
              : "You haven't logged today's dive yet. Don't let the streak dry out."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          label="Current streak"
          value={
            <>
              {streak} <span className="text-2xl">{streakFlames(streak) || "🫧"}</span>
            </>
          }
          hint={`${streakTitle(streak)} · best ever ${longest}`}
          accent="krill"
        />
        <StatTile label="This week" value={weekTotal} hint={`${weekScores.length} dive${weekScores.length === 1 ? "" : "s"} · ${formatMetres(depthMetres(weekTotal))}`} />
        <StatTile label="Best this week" value={weekBest} hint={weekBest ? formatMetres(depthMetres(weekBest)) : "No dives yet"} accent="sun" />
        <StatTile label="All-time best" value={allTimeBest} hint={isFullDepth(allTimeBest) ? "One in a Krillion!" : `${all.length} dives logged`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <Section title="Log a dive" emoji="📝" subtitle="One score per day. Logging the same day again overwrites it.">
            <ScoreForm today={today} existing={existing} />
          </Section>

          <Section title="Recent dives" emoji="🗓️">
            {recent.length === 0 ? (
              <EmptyState>No dives yet. Play Krillion, then come back and log your score.</EmptyState>
            ) : (
              <ul className="space-y-3">
                {recent.map((s) => (
                  <li key={s.id} className="flex items-center gap-3">
                    <div className="w-24 shrink-0 text-sm text-mist">{formatDayMonth(s.played_on)}</div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-display text-lg font-bold">
                          {s.score}
                          {isFullDepth(s.score) ? " 💎" : ""}
                        </span>
                        {s.note ? <span className="truncate text-xs text-mist italic">“{s.note}”</span> : null}
                      </div>
                      <DepthBar value={s.score} max={MAX_DAILY_SCORE} />
                    </div>
                    <form action={deleteScore}>
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="btn-ghost btn-sm" title="Delete this dive" aria-label="Delete this dive">
                        ✕
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Your boards" emoji="🏆" subtitle="Boards you've been assigned to.">
            {boards.length === 0 ? (
              <EmptyState emoji="🐚">
                You&apos;re not on a board yet. Ask the admin to add you to one.
              </EmptyState>
            ) : (
              <ul className="grid gap-3">
                {boards.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/boards/${b.id}`}
                      className="card-solid flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:border-aqua/50"
                    >
                      <span className="text-4xl" aria-hidden>
                        {b.emoji}
                      </span>
                      <span className="min-w-0">
                        <span className="heading block truncate text-lg">{b.name}</span>
                        {b.description ? <span className="block truncate text-sm text-mist">{b.description}</span> : null}
                      </span>
                      <span className="ml-auto text-mist">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="How scoring works" emoji="🤿">
            <ul className="space-y-2 text-sm text-mist">
              <li>Krillion gives you 7 prompts a day. Rare answers pay more, up to 100 each.</li>
              <li>So a perfect day is {MAX_DAILY_SCORE} points. Log your total here.</li>
              <li>Every point is 4 metres of depth. {MAX_DAILY_SCORE} points is {formatMetres(depthMetres(MAX_DAILY_SCORE))} down.</li>
              <li>Streaks count consecutive UTC days with a logged dive.</li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
