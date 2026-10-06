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

  let { data: profile } = await supabase
    .from("krillion_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // First visit (or an account from another app sharing this Supabase project):
    // create the Krillion profile. The first profile ever becomes admin.
    const { data: created } = await supabase.rpc("krillion_ensure_profile", {
      p_display_name: (user.user_metadata?.display_name as string | undefined) ?? null,
    });
    profile = created ?? null;
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
