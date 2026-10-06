import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

/**
 * Where links from Supabase emails land (password reset, and email
 * confirmation if that is ever turned on). Exchanges the one-time code in the
 * link for a session cookie, then continues to `next`.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  // Expired link, already used, or opened in a different browser than the one
  // that asked for it (the one-time code is tied to that browser).
  const back = new URL("/forgot-password", url.origin);
  back.searchParams.set("error", "link");
  return NextResponse.redirect(back);
}
