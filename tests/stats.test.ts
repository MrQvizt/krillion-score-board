import { describe, expect, it } from "vitest";
import {
  activeDivers,
  bestSingleDives,
  currentStreak,
  divesOn,
  longestStreak,
  streakBoard,
  weekGrid,
  weeklyTotals,
} from "@/lib/stats";
import { addDays, isoWeekNumber, weekDays, weekLabel, weekStart } from "@/lib/week";

const anna = { id: "a", display_name: "Anna" };
const bob = { id: "b", display_name: "Bob" };
const cleo = { id: "c", display_name: "Cleo" };
const members = [bob, cleo, anna];

const WEEK = "2026-10-05"; // Monday
const scores = [
  { user_id: "a", played_on: "2026-10-05", score: 400 },
  { user_id: "a", played_on: "2026-10-06", score: 650, note: "taleggio" },
  { user_id: "a", played_on: "2026-10-07", score: 300 },
  { user_id: "b", played_on: "2026-10-06", score: 650 },
  { user_id: "b", played_on: "2026-10-08", score: 700 },
  { user_id: "b", played_on: "2026-10-04", score: 999 }, // previous week, ignored
  { user_id: "zzz", played_on: "2026-10-06", score: 700 }, // not a member
];

describe("week helpers", () => {
  it("finds the Monday of a week", () => {
    expect(weekStart("2026-10-05")).toBe("2026-10-05");
    expect(weekStart("2026-10-11")).toBe("2026-10-05");
    expect(weekStart("2026-10-12")).toBe("2026-10-12");
    expect(weekStart("2026-01-01")).toBe("2025-12-29");
  });
  it("lists seven days and labels the week", () => {
    expect(weekDays(WEEK)).toHaveLength(7);
    expect(weekDays(WEEK)[6]).toBe("2026-10-11");
    expect(isoWeekNumber("2026-10-05")).toBe(41);
    expect(weekLabel(WEEK)).toBe("Week 41 · 5 – 11 Oct 2026");
    expect(weekLabel("2026-09-28")).toBe("Week 40 · 28 Sep – 4 Oct 2026");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });
});

describe("best single dive", () => {
  it("ranks members by their top score, ties by earlier date", () => {
    const ranked = bestSingleDives(scores, members, WEEK);
    expect(ranked.map((r) => [r.member.display_name, r.score, r.played_on])).toEqual([
      ["Bob", 700, "2026-10-08"],
      ["Anna", 650, "2026-10-06"],
    ]);
    expect(ranked[1].note).toBe("taleggio");
  });
});

describe("weekly totals", () => {
  it("sums the week and includes members without dives", () => {
    const totals = weeklyTotals(scores, members, WEEK);
    expect(totals.map((t) => [t.member.display_name, t.total, t.dives, t.average, t.best])).toEqual([
      ["Bob", 1350, 2, 675, 700],
      ["Anna", 1350, 3, 450, 650],
      ["Cleo", 0, 0, 0, 0],
    ]);
    expect(activeDivers(scores, members, WEEK)).toBe(2);
  });
});

describe("streaks", () => {
  const dates = ["2026-10-01", "2026-10-02", "2026-10-04", "2026-10-05", "2026-10-06"];
  it("counts back from today", () => {
    expect(currentStreak(dates, "2026-10-06")).toBe(3);
  });
  it("stays alive when today is not played yet", () => {
    expect(currentStreak(dates, "2026-10-07")).toBe(3);
  });
  it("dies after a missed day", () => {
    expect(currentStreak(dates, "2026-10-08")).toBe(0);
  });
  it("finds the longest run ever", () => {
    expect(longestStreak(dates)).toBe(3);
    expect(longestStreak([])).toBe(0);
    expect(longestStreak(["2026-01-01"])).toBe(1);
  });
  it("builds the streak board", () => {
    const board = streakBoard(scores, members, "2026-10-08");
    expect(board.map((s) => [s.member.display_name, s.current, s.longest, s.playedToday])).toEqual([
      ["Anna", 3, 3, false],
      ["Bob", 1, 1, true],
      ["Cleo", 0, 0, false],
    ]);
  });
});

describe("day and grid views", () => {
  it("lists a day's dives ranked", () => {
    expect(divesOn(scores, members, "2026-10-06").map((d) => d.member.display_name)).toEqual([
      "Anna",
      "Bob",
    ]);
  });
  it("fills the week grid", () => {
    const grid = weekGrid(scores, members, WEEK);
    expect(grid[0].member.display_name).toBe("Anna");
    expect(grid[0].cells).toEqual([400, 650, 300, null, null, null, null]);
    expect(grid[2].member.display_name).toBe("Cleo");
    expect(grid[2].total).toBe(0);
  });
});
