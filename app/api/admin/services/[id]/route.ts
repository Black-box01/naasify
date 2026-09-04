import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serviceUpdateSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Partially update a service (toggle is_active, rename, reorder, etc.). */
export async function PATCH(request: Request, { params }: Ctx) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = serviceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid service" },
      { status: 400 },
    );
  }
  const patch: Record<string, unknown> = { ...parsed.data };
  if (typeof patch.name === "string" && patch.slug === undefined) {
    patch.slug = slugify(patch.name);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("naasify_services")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ service: data });
}

/** Delete a service. Its plans cascade-delete at the database level. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("naasify_services").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
