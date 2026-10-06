/**
 * Pure leaderboard maths. Everything takes plain rows so it is easy to test.
 */
import { MAX_DAILY_SCORE, METRES_PER_POINT } from "./constants";
import { addDays, isInWeek, weekDays } from "./week";

export type ScoreRow = {
  user_id: string;
  played_on: string; // YYYY-MM-DD
  score: number;
  note?: string | null;
};

export type Member = {
  id: string;
  display_name: string;
};

export type BestDive = { member: Member; score: number; played_on: string; note: string };
export type WeeklyTotal = {
  member: Member;
  total: number;
  dives: number;
  average: number;
  best: number;
};
export type StreakEntry = {
  member: Member;
  current: number;
  longest: number;
  playedToday: boolean;
};
export type GridRow = { member: Member; cells: (number | null)[]; total: number };

function byMember(members: Member[]) {
  return new Map(members.map((m) => [m.id, m]));
}

function sortedMembers(members: Member[]) {
  return [...members].sort((a, b) => a.display_name.localeCompare(b.display_name));
}

export function depthMetres(score: number): number {
  return score * METRES_PER_POINT;
}

export function formatMetres(m: number): string {
  return `${m.toLocaleString("en-GB")} m`;
}

export function isFullDepth(score: number): boolean {
  return score >= MAX_DAILY_SCORE;
}

/** Highest single dive per member inside the week, ranked. */
export function bestSingleDives(scores: ScoreRow[], members: Member[], start: string): BestDive[] {
  const lookup = byMember(members);
  const best = new Map<string, BestDive>();
  for (const s of scores) {
    if (!isInWeek(s.played_on, start)) continue;
    const member = lookup.get(s.user_id);
    if (!member) continue;
    const prev = best.get(s.user_id);
    if (!prev || s.score > prev.score || (s.score === prev.score && s.played_on < prev.played_on)) {
      best.set(s.user_id, { member, score: s.score, played_on: s.played_on, note: s.note ?? "" });
    }
  }
  return [...best.values()].sort(
    (a, b) =>
      b.score - a.score ||
      a.played_on.localeCompare(b.played_on) ||
      a.member.display_name.localeCompare(b.member.display_name),
  );
}

/** Sum of all dives in the week per member, ranked. Ties go to the higher average. Members with no dives come last. */
export function weeklyTotals(scores: ScoreRow[], members: Member[], start: string): WeeklyTotal[] {
  const totals = new Map<string, WeeklyTotal>();
  for (const member of sortedMembers(members)) {
    totals.set(member.id, { member, total: 0, dives: 0, average: 0, best: 0 });
  }
  for (const s of scores) {
    if (!isInWeek(s.played_on, start)) continue;
    const t = totals.get(s.user_id);
    if (!t) continue;
    t.total += s.score;
    t.dives += 1;
    t.best = Math.max(t.best, s.score);
  }
  for (const t of totals.values()) {
    t.average = t.dives ? Math.round(t.total / t.dives) : 0;
  }
  return [...totals.values()].sort(
    (a, b) =>
      b.total - a.total ||
      a.dives - b.dives || // same total in fewer dives = higher average
      a.member.display_name.localeCompare(b.member.display_name),
  );
}

/**
 * Consecutive days played, counting back from today. A streak is still alive
 * if today has not been played yet (it then counts back from yesterday).
 */
export function currentStreak(dates: Iterable<string>, today: string): number {
  const set = new Set(dates);
  let day = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(day)) {
    n += 1;
    day = addDays(day, -1);
  }
  return n;
}

export function longestStreak(dates: Iterable<string>): number {
  const sorted = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** Streak leaderboard. Uses every score passed in, not just the week. */
export function streakBoard(scores: ScoreRow[], members: Member[], today: string): StreakEntry[] {
  const dates = new Map<string, string[]>();
  for (const s of scores) {
    const list = dates.get(s.user_id) ?? [];
    list.push(s.played_on);
    dates.set(s.user_id, list);
  }
  return sortedMembers(members)
    .map((member) => {
      const d = dates.get(member.id) ?? [];
      return {
        member,
        current: currentStreak(d, today),
        longest: longestStreak(d),
        playedToday: d.includes(today),
      };
    })
    .sort(
      (a, b) =>
        b.current - a.current ||
        b.longest - a.longest ||
        a.member.display_name.localeCompare(b.member.display_name),
    );
}

export function streakFlames(n: number): string {
  if (n >= 30) return "🔥🔥🔥🔥";
  if (n >= 14) return "🔥🔥🔥";
  if (n >= 7) return "🔥🔥";
  if (n >= 3) return "🔥";
  return "";
}

export function streakTitle(n: number): string {
  if (n >= 30) return "Living legend";
  if (n >= 14) return "Deep-sea regular";
  if (n >= 7) return "On fire";
  if (n >= 3) return "Warming up";
  if (n >= 1) return "Dipped a toe";
  return "Dry land";
}

/** Dives logged for a given day, ranked. */
export function divesOn(scores: ScoreRow[], members: Member[], day: string): BestDive[] {
  const lookup = byMember(members);
  return scores
    .filter((s) => s.played_on === day && lookup.has(s.user_id))
    .map((s) => ({
      member: lookup.get(s.user_id)!,
      score: s.score,
      played_on: s.played_on,
      note: s.note ?? "",
    }))
    .sort((a, b) => b.score - a.score || a.member.display_name.localeCompare(b.member.display_name));
}

/** Member x weekday grid for the week. */
export function weekGrid(scores: ScoreRow[], members: Member[], start: string): GridRow[] {
  const days = weekDays(start);
  const index = new Map<string, number>(days.map((d, i) => [d, i]));
  const rows = new Map<string, GridRow>();
  for (const member of sortedMembers(members)) {
    rows.set(member.id, { member, cells: Array(7).fill(null), total: 0 });
  }
  for (const s of scores) {
    const i = index.get(s.played_on);
    const row = rows.get(s.user_id);
    if (i === undefined || !row) continue;
    row.cells[i] = s.score;
    row.total += s.score;
  }
  return [...rows.values()].sort((a, b) => b.total - a.total);
}

/** Number of members who have logged at least one dive in the week. */
export function activeDivers(scores: ScoreRow[], members: Member[], start: string): number {
  const ids = new Set(members.map((m) => m.id));
  const active = new Set<string>();
  for (const s of scores) if (isInWeek(s.played_on, start) && ids.has(s.user_id)) active.add(s.user_id);
  return active.size;
}

export function medal(rank: number): string {
  return ["🥇", "🥈", "🥉"][rank] ?? `#${rank + 1}`;
}

/** Playful label for a single dive score. */
export function diveVerdict(score: number): string {
  if (score >= MAX_DAILY_SCORE) return "One in a Krillion!";
  if (score >= 600) return "Abyssal";
  if (score >= 500) return "Deep diver";
  if (score >= 400) return "Nice depth";
  if (score >= 300) return "Getting wet";
  if (score >= 150) return "Paddling";
  return "Snorkelling";
}
