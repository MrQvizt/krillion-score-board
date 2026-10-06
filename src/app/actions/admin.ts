"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { BOARD_EMOJIS } from "@/lib/constants";
import type { FormState } from "./types";

function text(formData: FormData, key: string, max: number): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function pickEmoji(raw: string): string {
  const e = raw.trim();
  if (!e) return BOARD_EMOJIS[0];
  return [...e].slice(0, 2).join("") || BOARD_EMOJIS[0];
}

export async function createBoard(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireAdmin();
  const name = text(formData, "name", 60);
  const description = text(formData, "description", 300);
  const emoji = pickEmoji(text(formData, "emoji", 8));
  const values = { name, description, emoji };

  if (!name) return { error: "Give the board a name.", values };

  const { data, error } = await supabase
    .from("krillion_boards")
    .insert({ name, description, emoji, created_by: user.id })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create board.", values };

  // The admin usually wants to be on their own board.
  await supabase.from("krillion_board_members").insert({ board_id: data.id, user_id: user.id });

  revalidatePath("/", "layout");
  redirect(`/admin/boards/${data.id}`);
}

export async function updateBoard(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id", 64);
  const name = text(formData, "name", 60);
  const description = text(formData, "description", 300);
  const emoji = pickEmoji(text(formData, "emoji", 8));
  const values = { name, description, emoji };

  if (!id) return { error: "Missing board.", values };
  if (!name) return { error: "Give the board a name.", values };

  const { error } = await supabase.from("krillion_boards").update({ name, description, emoji }).eq("id", id);
  if (error) return { error: error.message, values };

  revalidatePath("/", "layout");
  return { success: "Board saved.", values };
}

export async function deleteBoard(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id", 64);
  if (!id) return;
  await supabase.from("krillion_boards").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function addMember(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const boardId = text(formData, "board_id", 64);
  const userId = text(formData, "user_id", 64);
  if (!boardId || !userId) return;
  await supabase.from("krillion_board_members").upsert({ board_id: boardId, user_id: userId });
  revalidatePath("/", "layout");
}

export async function removeMember(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const boardId = text(formData, "board_id", 64);
  const userId = text(formData, "user_id", 64);
  if (!boardId || !userId) return;
  await supabase.from("krillion_board_members").delete().eq("board_id", boardId).eq("user_id", userId);
  revalidatePath("/", "layout");
}

export async function setAdmin(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();
  const userId = text(formData, "user_id", 64);
  const value = text(formData, "value", 5) === "true";
  if (!userId) return;
  if (userId === user.id && !value) return; // never demote yourself and lock everyone out
  await supabase.from("krillion_profiles").update({ is_admin: value }).eq("id", userId);
  revalidatePath("/", "layout");
}
