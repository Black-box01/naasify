import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client (cookie-based session via @supabase/ssr).
 * Only ever uses the anon key — safe for "use client" components.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
}
