import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Server-only by construction — the
 * "server-only" import makes any client-component import a build error,
 * which is the guardrail that matters for a key that bypasses RLS.
 */
let client: SupabaseClient | null = null;

export const supabaseAdmin = (): SupabaseClient => {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see admin/.env.local)"
      );
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
};
