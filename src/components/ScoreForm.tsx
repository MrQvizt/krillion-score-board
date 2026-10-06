"use client";

import { useActionState, useState } from "react";
import { saveScore } from "@/app/actions/scores";
import { idle } from "@/app/actions/types";
import { EARLIEST_PLAY_DATE, MAX_DAILY_SCORE } from "@/lib/constants";
import { depthMetres, diveVerdict, formatMetres } from "@/lib/stats";
import { Flash } from "./ui";
import { SubmitButton } from "./SubmitButton";

type Existing = Record<string, { score: number; note: string }>;

export function ScoreForm({ today, existing }: { today: string; existing: Existing }) {
  const [state, action] = useActionState(saveScore, idle);
  const initialDate = state.values?.played_on || today;
  const [date, setDate] = useState(initialDate);
  const [score, setScore] = useState(state.values?.score ?? (existing[initialDate] ? String(existing[initialDate].score) : ""));
  const [note, setNote] = useState(state.values?.note ?? existing[initialDate]?.note ?? "");

  // When the date changes, prefill with what is already logged for that day.
  function pickDate(next: string) {
    setDate(next);
    const found = existing[next];
    setScore(found ? String(found.score) : "");
    setNote(found ? found.note : "");
  }

  const already = existing[date];
  const n = Number(score);
  const preview = score !== "" && Number.isFinite(n) && n >= 0 && n <= MAX_DAILY_SCORE ? n : null;

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
        <div>
          <label className="label" htmlFor="played_on">
            Dive day (UTC)
          </label>
          <input
            id="played_on"
            name="played_on"
            type="date"
            className="input"
            value={date}
            min={EARLIEST_PLAY_DATE}
            max={today}
            onChange={(e) => pickDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="score">
            Score (0–{MAX_DAILY_SCORE})
          </label>
          <input
            id="score"
            name="score"
            type="number"
            inputMode="numeric"
            className="input text-2xl font-display font-bold"
            placeholder="e.g. 455"
            min={0}
            max={MAX_DAILY_SCORE}
            step={1}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="note">
          Brag line <span className="font-normal text-mist/60">(optional)</span>
        </label>
        <input
          id="note"
          name="note"
          className="input"
          placeholder="Got the One in a Krillion on cheeses 🧀"
          maxLength={140}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-mist">
          {preview !== null ? (
            <>
              <span className="font-display font-bold text-aqua">{diveVerdict(preview)}</span>{" "}
              · {formatMetres(depthMetres(preview))} deep
            </>
          ) : already ? (
            <>
              Already logged <span className="font-bold text-foam">{already.score}</span> for this day. Saving
              will overwrite it.
            </>
          ) : (
            "Type your score to see how deep you went."
          )}
        </p>
        <SubmitButton pendingText="Splashing…">{already ? "Update dive" : "Log dive 🌊"}</SubmitButton>
      </div>

      <Flash state={state} />
    </form>
  );
}
