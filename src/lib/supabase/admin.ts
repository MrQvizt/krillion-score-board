import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { supabaseServiceRoleKey, supabaseUrl } from "./env";

/**
 * Service-role client. Bypasses RLS, so it is only ever used server-side for
 * account creation. Returns null when the key is not configured.
 */
export function createAdminClient() {
  const key = supabaseServiceRoleKey();
  if (!key) return null;
  return createClient<Database>(supabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
