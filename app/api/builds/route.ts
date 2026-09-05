import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/admin";
import { buildUploadSchema } from "@/lib/validation";
import { getEntitlements, checkUpload } from "@/lib/entitlements";
import { BUILDS_BUCKET } from "@/lib/constants";
import type { UserBuild } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Authorize and stage a project build.
 *
 * The server — never the browser — decides whether an upload is allowed. It
 * re-resolves the caller's plan entitlements and enforces the storage quota,
 * per-file cap, allowed file types and build limit, then issues a single-object
 * signed upload URL and records a `pending` build row. The client uploads the
 * bytes to that signed URL; if the upload fails it calls DELETE /api/builds/[id]
 * to roll the staged row back. This is why the browser can no longer insert
 * build rows or storage objects directly (those RLS policies were dropped).
 */
export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = buildUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid upload" },
      { status: 400 },
    );
  }
  const { file_name, file_size, mime_type } = parsed.data;

  const ent = await getEntitlements(current.user.id);
  const gate = checkUpload(ent, { fileName: file_name, fileSize: file_size });
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: 403 });
  }

  const supabase = createServiceClient();
  const safeName = file_name.replace(/[^\w.\-]+/g, "_");
  const fileKey = `${current.user.id}/${Date.now()}-${safeName}`;

  const { data: signed, error: signError } = await supabase.storage
    .from(BUILDS_BUCKET)
    .createSignedUploadUrl(fileKey);
  if (signError || !signed) {
    return NextResponse.json(
      { error: signError?.message || "Could not authorize the upload" },
      { status: 500 },
    );
  }

  const { data: build, error: insertError } = await supabase
    .from("naasify_user_builds")
    .insert({
      user_id: current.user.id,
      file_name,
      file_key: fileKey,
      file_size,
      mime_type: mime_type ?? null,
      status: "pending",
    })
    .select()
    .single();
  if (insertError || !build) {
    return NextResponse.json(
      { error: insertError?.message || "Could not create the build record" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    build: build as UserBuild,
    fileKey: signed.path,
    token: signed.token,
  });
}
