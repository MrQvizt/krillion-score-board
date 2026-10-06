import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Setup check" };
export const dynamic = "force-dynamic";

const MIGRATION = "supabase/migrations/20261006000000_krillion_init.sql";

type Check = { label: string; ok: boolean; detail: string; hint?: string };

function explain(code: string | null | undefined, message: string): string | undefined {
  // PostgREST: table/function missing from the schema cache. Postgres: undefined table/function.
  if (code === "PGRST205" || code === "PGRST202" || code === "42P01" || code === "42883" || /schema cache/i.test(message)) {
    return `The database schema has not been applied to this Supabase project. Open the project's SQL Editor and run ${MIGRATION}, then reload this page.`;
  }
  if (code === "42501" || /permission denied/i.test(message)) {
    return "The signed-in role is not allowed to use this object. Re-run the migration: it re-applies the grants and policies.";
  }
  return undefined;
}

/**
 * Self-diagnosis page. The app sends a signed-in user here when their Krillion
 * profile cannot be read or created, instead of bouncing between /dashboard
 * and /login. Each check talks to Supabase with the visitor's own session, so
 * what it reports is exactly what the dashboard would hit.
 */
export default async function SetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const checks: Check[] = [];

  const table = await supabase.from("krillion_profiles").select("id", { head: true, count: "exact" });
  checks.push(
    table.error
      ? {
          label: "Table krillion_profiles",
          ok: false,
          detail: `${table.error.code ?? "error"}: ${table.error.message}`,
          hint: explain(table.error.code, table.error.message),
        }
      : { label: "Table krillion_profiles", ok: true, detail: "Found." },
  );

  if (user) {
    const profile = await supabase.rpc("krillion_ensure_profile", {
      p_display_name: (user.user_metadata?.display_name as string | undefined) ?? null,
    });
    checks.push(
      profile.error
        ? {
            label: "Your Krillion profile",
            ok: false,
            detail: `${profile.error.code ?? "error"}: ${profile.error.message}`,
            hint: explain(profile.error.code, profile.error.message),
          }
        : profile.data
          ? {
              label: "Your Krillion profile",
              ok: true,
              detail: `${profile.data.display_name}${profile.data.is_admin ? " (admin)" : ""}`,
            }
          : { label: "Your Krillion profile", ok: false, detail: "krillion_ensure_profile() returned nothing." },
    );
  } else {
    checks.push({ label: "Your Krillion profile", ok: false, detail: "Not signed in, so this cannot be checked." });
  }

  const allOk = checks.every((c) => c.ok);
  const host = new URL(supabaseUrl()).host;

  return (
    <AuthShell
      title={allOk ? "All good" : "Something needs setting up"}
      subtitle={`Checked against ${host} as ${user?.email ?? "a signed-out visitor"}.`}
    >
      <ul className="space-y-3">
        {checks.map((c) => (
          <li key={c.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <span aria-hidden>{c.ok ? "✅" : "❌"}</span>
              <span className="font-display font-semibold">{c.label}</span>
            </div>
            <p className="mt-1 break-words text-mist">{c.detail}</p>
            {c.hint ? <p className="mt-2 text-foam">{c.hint}</p> : null}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {allOk ? (
          <Link href="/dashboard" className="btn-primary">
            Go to the dashboard
          </Link>
        ) : (
          <Link href="/setup" className="btn-primary">
            Check again
          </Link>
        )}
        {user ? (
          <form action={signOut}>
            <button type="submit" className="btn-ghost">
              Sign out
            </button>
          </form>
        ) : (
          <Link href="/login" className="btn-ghost">
            Log in
          </Link>
        )}
      </div>
    </AuthShell>
  );
}
