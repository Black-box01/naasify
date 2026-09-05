import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile, UserBuild } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "processing", "completed"];
const PAGE_SIZE = 25;

/**
 * List user builds for the admin table (newest first).
 *   ?status=pending        filter by status
 *   ?cursor=<uploaded_at>  keyset pagination, 25/page
 * Each build is enriched with its uploader (name + email) — user_id points at
 * auth.users, so profiles are fetched separately rather than embedded.
 */
export async function GET(request: Request) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const cursor = url.searchParams.get("cursor");

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("naasify_user_builds")
    .select("*")
    .order("uploaded_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (status && STATUSES.includes(status)) query = query.eq("status", status);
  if (cursor) query = query.lt("uploaded_at", cursor);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const builds = (data ?? []) as UserBuild[];

  const userIds = [...new Set(builds.map((b) => b.user_id).filter(Boolean))];
  const users = new Map<string, Pick<Profile, "id" | "email" | "full_name">>();
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from("naasify_profiles")
      .select("id, email, full_name")
      .in("id", userIds);
    for (const p of (profiles ?? []) as Pick<Profile, "id" | "email" | "full_name">[]) {
      users.set(p.id, p);
    }
  }
  for (const b of builds) b.user = users.get(b.user_id) ?? null;

  const nextCursor =
    builds.length === PAGE_SIZE ? builds[builds.length - 1].uploaded_at : null;
  return NextResponse.json({ builds, nextCursor });
}
