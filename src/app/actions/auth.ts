"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminEmails } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = str(formData, "email").toLowerCase();
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";
  const displayName = str(formData, "display_name").slice(0, 40);
  const values = { email, display_name: displayName };

  if (!EMAIL_RE.test(email)) return { error: "That email doesn't look right.", values };
  if (password.length < 8) return { error: "Password needs at least 8 characters.", values };
  if (!displayName) return { error: "Pick a diver name so your friends know who's winning.", values };

  const admin = createAdminClient();
  const supabase = await createClient();

  if (admin) {
    // Service role: create a confirmed account straight away. No email round-trip.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (error) {
      const taken = /already|exists|registered/i.test(error.message);
      return {
        error: taken ? "That email already has an account. Try logging in." : error.message,
        values,
      };
    }
    // No trigger on the shared auth.users table. The Krillion profile is created
    // by krillion_ensure_profile() on the first page load, which also applies the
    // shared-project admin rules (first profile ever, Arena Tracker's app_admins)
    // and picks up the display name from the user metadata set above.
    // ADMIN_EMAILS is the one rule only this server knows about, so seed that
    // profile here; ensure_profile then finds it and leaves it alone.
    if (data.user && adminEmails().includes(email)) {
      await admin.from("krillion_profiles").upsert({
        id: data.user.id,
        display_name: displayName,
        is_admin: true,
      });
    }
  } else {
    // No service role key: fall back to a normal sign-up. Requires "Confirm email"
    // to be switched off in Supabase Auth settings for instant access.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { error: error.message, values };
    if (!data.session) {
      return {
        success:
          "Account created, but Supabase wants the email confirmed first. Check your inbox, or ask the admin to turn off email confirmation.",
        values,
      };
    }
    redirect("/dashboard");
  }

  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) return { error: loginError.message, values };
  redirect("/dashboard");
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = str(formData, "email").toLowerCase();
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";
  const next = safeNext(str(formData, "next"));
  const values = { email };

  if (!EMAIL_RE.test(email) || !password) {
    return { error: "Enter your email and password.", values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error: /invalid/i.test(error.message) ? "Wrong email or password." : error.message,
      values,
    };
  }
  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
