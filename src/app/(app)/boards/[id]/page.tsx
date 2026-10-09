import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BoardMascot } from "@/components/BoardMascot";
import { BestDiveList, DailyPodium, Podium, StreakList, TotalsList, WeekGridTable } from "@/components/Leaderboards";
import { Section, StatTile } from "@/components/ui";
import { WeekNav } from "@/components/WeekNav";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  activeDivers,
  bestSingleDives,
  depthMetres,
  divesOn,
  formatMetres,
  streakBoard,
  weekGrid,
  weeklyTotals,
  type Member,
} from "@/lib/stats";
import { formatLong, isInWeek, isValidDateString, todayUtc, weekDays, weekStart } from "@/lib/week";

export async function generateMetadata(props: PageProps<"/boards/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data } = await supabase.from("krillion_boards").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Board" };
}

export default async function BoardPage(props: PageProps<"/boards/[id]">) {
  const { id } = await props.params;
  const { w } = await props.searchParams;
  const { supabase, profile } = await requireSession();

  const today = todayUtc();
  const thisWeek = weekStart(today);
  const start = typeof w === "string" && isValidDateString(w) ? weekStart(w) : thisWeek;

  const { data: board } = await supabase.from("krillion_boards").select("*").eq("id", id).maybeSingle();
  if (!board) notFound();

  const { data: memberRows } = await supabase.from("krillion_board_members").select("user_id").eq("board_id", id);
  const memberIds = (memberRows ?? []).map((m) => m.user_id);

  let members: Member[] = [];
  let scores: { user_id: string; played_on: string; score: number; note: string }[] = [];
  if (memberIds.length) {
    const [{ data: profiles, error: profilesError }, { data: scoreRows }] = await Promise.all([
      supabase.from("krillion_profiles").select("id, display_name, full_name").in("id", memberIds),
      supabase.from("krillion_scores").select("user_id, played_on, score, note").in("user_id", memberIds),
    ]);
    // A failed read here (typically a column the database does not have yet
    // because a migration was not run) would render an empty board. Send the
    // visitor to the diagnostics page instead, which names the problem.
    if (profilesError) redirect("/setup");
    members = profiles ?? [];
    scores = scoreRows ?? [];
  }

  const totals = weeklyTotals(scores, members, start);
  const best = bestSingleDives(scores, members, start);
  const streaks = streakBoard(scores, members, today);
  const grid = weekGrid(scores, members, start);
  const todays = divesOn(scores, members, today);
  const weekScores = scores.filter((s) => isInWeek(s.played_on, start));
  const boardTotal = weekScores.reduce((sum, s) => sum + s.score, 0);
  const divers = activeDivers(scores, members, start);
  const topStreak = streaks[0];
  // The podium shows the top three divers who have dived; everyone else is
  // listed under it, from 4th place down, so the section is the whole board.
  const onPodium = new Set(totals.filter((e) => e.dives > 0).slice(0, 3).map((e) => e.member.id));
  const belowPodium = totals.filter((e) => !onPodium.has(e.member.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-4">
          <span className="animate-float text-6xl motion-reduce:animate-none" aria-hidden>
            <BoardMascot mascot={board.emoji} />
          </span>
          <div>
            <p className="eyebrow">Score board · {members.length} diver{members.length === 1 ? "" : "s"}</p>
            <h1 className="heading text-4xl sm:text-5xl">{board.name}</h1>
            {board.description ? <p className="mt-1 text-mist">{board.description}</p> : null}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <WeekNav boardId={board.id} start={start} thisWeek={thisWeek} />
          {profile.is_admin ? (
            <Link href={`/admin/boards/${board.id}`} className="text-xs text-mist hover:text-aqua">
              Manage members →
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Active divers" value={`${divers}/${members.length}`} hint="logged at least one dive this week" />
        <StatTile label="Dives this week" value={weekScores.length} hint={weekScores.length ? `${Math.round(boardTotal / weekScores.length)} avg per dive` : "none yet"} accent="sun" />
        <StatTile label="Combined depth" value={formatMetres(depthMetres(boardTotal))} hint={`${boardTotal} points together`} />
        <StatTile
          label="Hottest streak"
          value={topStreak && topStreak.current > 0 ? `${topStreak.current} 🔥` : "—"}
          hint={topStreak && topStreak.current > 0 ? topStreak.member.display_name : "nobody's on a run"}
          accent="krill"
        />
      </div>

      <Section
        title="Today's podium"
        emoji="🌊"
        subtitle={`${formatLong(today)} · best dives logged today, UTC. ${todays.length} of ${members.length} diver${members.length === 1 ? "" : "s"} down so far.`}
      >
        <DailyPodium entries={todays} />
        {todays.length > 3 ? (
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="eyebrow mb-3">Also dived today</p>
            <BestDiveList entries={todays.slice(3)} showDate={false} offset={3} />
          </div>
        ) : null}
      </Section>

      <Section title="Weekly podium" emoji="🏆" subtitle="Biggest total score this week.">
        <Podium entries={totals} />
        {belowPodium.length > 0 && onPodium.size > 0 ? (
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="eyebrow mb-3">The rest of the board</p>
            <TotalsList entries={belowPodium} offset={onPodium.size} scaleMax={totals[0]?.total} />
          </div>
        ) : null}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Deepest single dive" emoji="🤿" subtitle="Best one-day score this week.">
          <BestDiveList entries={best} />
        </Section>
        <Section title="Total depth" emoji="📊" subtitle="Everyone's weekly total, ranked.">
          <TotalsList entries={totals} />
        </Section>
      </div>

      <Section title="Hot streakers" emoji="🔥" subtitle="Consecutive days with a logged dive. Today still counts until midnight UTC.">
        <StreakList entries={streaks} />
      </Section>

      <Section title="The week, day by day" emoji="🗓️" subtitle="Brighter means deeper. 💎 is a perfect 700.">
        <WeekGridTable rows={grid} days={weekDays(start)} today={today} />
      </Section>
    </div>
  );
}
