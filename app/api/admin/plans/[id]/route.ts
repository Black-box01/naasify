import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { planUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Partially update a plan (price, features, highlight, active, reorder…). */
export async function PATCH(request: Request, { params }: Ctx) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = planUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid plan" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("naasify_plans")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ plan: data });
}

/**
 * Delete a plan. Blocked by the database when orders/subscriptions reference
 * it (FK 23503) — admins should deactivate those instead. We surface a clear
 * 409 so the UI can explain it.
 */
export async function DELETE(_request: Request, { params }: Ctx) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("naasify_plans").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return NextResponse.json(
        {
          error:
            "This plan has orders or subscriptions and cannot be deleted. Set it inactive to hide it instead.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
