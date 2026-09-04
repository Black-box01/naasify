import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Current session user + profile (role), or null when signed out. */
export async function getCurrentUser(): Promise<{
  user: User;
  profile: Profile | null;
} | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("naasify_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile: (profile as Profile | null) ?? null };
}

/** For protected layouts/pages: redirects to /login when signed out. */
export async function requireUser() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  return current;
}

/** For admin layouts/pages: redirects signed-out users and non-admins. */
export async function requireAdmin() {
  const current = await getCurrentUser();
  if (!current) redirect("/login?next=/admin");
  if (current.profile?.role !== "admin") redirect("/dashboard");
  return current;
}

/**
 * For /api/admin/* route handlers. Returns the session, or an object with a
 * ready-to-return 401/403 NextResponse (caller: `if ("response" in guard) return guard.response;`).
 */
export async function requireAdminApi(): Promise<
  | { user: User; profile: Profile | null }
  | { response: NextResponse }
> {
  const current = await getCurrentUser();
  if (!current) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (current.profile?.role !== "admin") {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return current;
}
