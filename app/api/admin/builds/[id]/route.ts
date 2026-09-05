import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildStatusSchema } from "@/lib/validation";
import { BUILDS_BUCKET } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Move a build through pending -> processing -> completed (deployed). */
export async function PATCH(request: Request, { params }: Ctx) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = buildStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid status" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("naasify_user_builds")
    .update({ status: parsed.data.status })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ build: data });
}

/** Remove the stored file (best-effort) then delete the database row. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: build, error: fetchError } = await supabase
    .from("naasify_user_builds")
    .select("file_key")
    .eq("id", id)
    .single();
  if (fetchError || !build) {
    return NextResponse.json({ error: "Build not found" }, { status: 404 });
  }

  const { error: storageError } = await supabase.storage
    .from(BUILDS_BUCKET)
    .remove([build.file_key as string]);

  const { error: rowError } = await supabase
    .from("naasify_user_builds")
    .delete()
    .eq("id", id);
  if (rowError) return NextResponse.json({ error: rowError.message }, { status: 500 });

  // The row is the source of truth; a missing storage object is non-fatal.
  return NextResponse.json({ ok: true, storageRemoved: !storageError });
}
