import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "paid", "failed", "refunded"];
const PAGE_SIZE = 25;

/**
 * List orders for the admin table.
 *   ?status=paid          filter by status
 *   ?cursor=<created_at>  keyset pagination (created_at < cursor), 25/page
 */
export async function GET(request: Request) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const cursor = url.searchParams.get("cursor");

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("naasify_orders")
    .select("*, plan:naasify_plans(id, name)")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (status && STATUSES.includes(status)) {
    query = query.eq("status", status);
  }
  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const orders = data ?? [];
  const nextCursor =
    orders.length === PAGE_SIZE
      ? (orders[orders.length - 1].created_at as string)
      : null;
  return NextResponse.json({ orders, nextCursor });
}
