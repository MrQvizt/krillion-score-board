import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type Session = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email: string | null };
  profile: Profile;
};

/** Current user with profile, or null when signed out. */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (!profile) {
    // Accounts created before this app existed have no profile yet. Make one.
    const fallbackName =
      (user.user_metadata?.display_name as string | undefined)?.trim() ||
      user.email?.split("@")[0] ||
      "diver";
    const { data: created } = await supabase
      .from("profiles")
      .insert({ id: user.id, display_name: fallbackName.slice(0, 40) })
      .select("*")
      .single();
    profile = created;
  }

  if (!profile) return null;
  return { supabase, user: { id: user.id, email: user.email ?? null }, profile };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (!session.profile.is_admin) redirect("/dashboard");
  return session;
}
