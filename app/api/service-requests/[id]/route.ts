import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Cancel one of the caller's own still-pending add-on requests.
 *
 * Only `pending` requests can be withdrawn — once an admin has approved,
 * fulfilled or rejected a request it becomes part of the audit trail and is
 * managed from Admin > Requests instead. Ownership is enforced twice: by the
 * RLS select/delete policies and again explicitly here.
 */
export async function DELETE(_request: Request, { params }: Ctx) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: fetchError } = await supabase
    .from("naasify_service_requests")
    .select("id, user_id, status")
    .eq("id", id)
    .single();
  if (fetchError || !existing) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (existing.user_id !== current.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending requests can be cancelled" },
      { status: 409 },
    );
  }

  const { error } = await supabase
    .from("naasify_service_requests")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
