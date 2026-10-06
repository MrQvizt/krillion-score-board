"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { EARLIEST_PLAY_DATE, MAX_DAILY_SCORE } from "@/lib/constants";
import { diveVerdict } from "@/lib/stats";
import { isValidDateString, todayUtc } from "@/lib/week";
import type { FormState } from "./types";

export async function saveScore(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireSession();

  const playedOn = String(formData.get("played_on") ?? "");
  const rawScore = String(formData.get("score") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 140);
  const values = { played_on: playedOn, score: rawScore, note };

  if (!isValidDateString(playedOn)) return { error: "Pick a valid date.", values };
  const today = todayUtc();
  if (playedOn > today) return { error: "That dive hasn't happened yet (days follow UTC).", values };
  if (playedOn < EARLIEST_PLAY_DATE) return { error: "That's a bit too far back.", values };

  if (!/^\d+$/.test(rawScore)) return { error: "Score must be a whole number.", values };
  const score = Number(rawScore);
  if (score < 0 || score > MAX_DAILY_SCORE) {
    return { error: `Score must be between 0 and ${MAX_DAILY_SCORE}.`, values };
  }

  const { error } = await supabase
    .from("scores")
    .upsert({ user_id: user.id, played_on: playedOn, score, note }, { onConflict: "user_id,played_on" });

  if (error) return { error: error.message, values };

  revalidatePath("/", "layout");
  return {
    success: `${diveVerdict(score)} ${score} points logged for ${playedOn}.`,
    values: { played_on: playedOn, score: "", note: "" },
  };
}

export async function deleteScore(formData: FormData): Promise<void> {
  const { supabase, user } = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("scores").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/", "layout");
}
