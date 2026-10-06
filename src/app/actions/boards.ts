"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";

function id(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim().slice(0, 64) : "";
}

/** Ask to join a board. RLS only allows asking for yourself, and not for a board you are already on. */
export async function requestToJoin(formData: FormData): Promise<void> {
  const { supabase, user } = await requireSession();
  const boardId = id(formData, "board_id");
  if (!boardId) return;
  await supabase.from("krillion_board_join_requests").upsert({ board_id: boardId, user_id: user.id });
  revalidatePath("/", "layout");
}

/** Withdraw your own pending request. */
export async function cancelJoinRequest(formData: FormData): Promise<void> {
  const { supabase, user } = await requireSession();
  const boardId = id(formData, "board_id");
  if (!boardId) return;
  await supabase.from("krillion_board_join_requests").delete().eq("board_id", boardId).eq("user_id", user.id);
  revalidatePath("/", "layout");
}
