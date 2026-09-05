import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile, ServiceRequestWithUser } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "approved", "fulfilled", "rejected"];
const PAGE_SIZE = 25;

/**
 * List add-on service requests for the admin table (newest first).
 *   ?status=pending        filter by status
 *   ?cursor=<created_at>   keyset pagination, 25/page
 * Each request is enriched with its requester (name + email, fetched separately
 * because user_id points at auth.users) and its embedded service.
 */
export async function GET(request: Request) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const cursor = url.searchParams.get("cursor");

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("naasify_service_requests")
    .select("*, service:naasify_services(id, name, slug, icon_key)")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (status && STATUSES.includes(status)) query = query.eq("status", status);
  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const requests = (data ?? []) as ServiceRequestWithUser[];

  const userIds = [...new Set(requests.map((r) => r.user_id).filter(Boolean))];
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
  for (const r of requests) r.user = users.get(r.user_id) ?? null;

  const nextCursor =
    requests.length === PAGE_SIZE ? requests[requests.length - 1].created_at : null;
  return NextResponse.json({ requests, nextCursor });
}
