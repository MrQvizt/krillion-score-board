import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type Session = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email: string | null };
  profile: Profile;
};

/**
 * Current user with profile, or null when signed out.
 *
 * A signed-in user whose profile cannot be read or created is sent to /setup,
 * which shows the underlying database error (typically: the migration has
 * not been run yet). It must NOT fall through to /login: the proxy bounces
 * signed-in visitors from /login back to /dashboard, and the client router
 * would follow that ping-pong forever, leaving a blank, frozen tab.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing, error: readError } = await supabase
    .from("krillion_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (readError) redirect("/setup");

  let profile = existing;
  if (!profile) {
    // First visit (or an account from another app sharing this Supabase project):
    // create the Krillion profile. The first profile ever becomes admin.
    const { data: created, error: createError } = await supabase.rpc("krillion_ensure_profile", {
      p_display_name: (user.user_metadata?.display_name as string | undefined) ?? null,
    });
    if (createError || !created) redirect("/setup");
    profile = created;
  }

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
