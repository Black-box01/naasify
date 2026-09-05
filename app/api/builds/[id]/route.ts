import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/admin";
import { BUILDS_BUCKET } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Roll back a staged build the owner never finished uploading. Only the owner's
 * own `pending` build can be removed here; the admin lifecycle (processing /
 * completed / delete-any) lives under /api/admin/builds/[id].
 */
export async function DELETE(_request: Request, { params }: Ctx) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const supabase = createServiceClient();
  const { data: build, error: fetchError } = await supabase
    .from("naasify_user_builds")
    .select("id, user_id, file_key, status")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !build) {
    return NextResponse.json({ error: "Build not found" }, { status: 404 });
  }
  if (build.user_id !== current.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (build.status !== "pending") {
    return NextResponse.json(
      { error: "Only a pending upload can be cancelled" },
      { status: 409 },
    );
  }

  // Remove any partial object (best-effort), then the staged row.
  await supabase.storage.from(BUILDS_BUCKET).remove([build.file_key as string]);
  const { error: rowError } = await supabase
    .from("naasify_user_builds")
    .delete()
    .eq("id", id);
  if (rowError) return NextResponse.json({ error: rowError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
