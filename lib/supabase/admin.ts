import { createClient } from "@supabase/supabase-js";

/**
 * SERVER-ONLY Supabase client using the service role key (bypasses RLS).
 * Never import this file from a "use client" component.
 *
 * Used by: contact route, checkout, Paystack webhook/callback, receipts.
 */
export function createServiceClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
