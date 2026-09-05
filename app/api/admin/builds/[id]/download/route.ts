import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/admin";
import { BUILDS_BUCKET } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * One-click admin download. The stored object lives under another user's
 * folder, so we mint a short-lived signed URL with the service-role client
 * (RLS would otherwise block it) and redirect the browser straight to it.
 * `download: file_name` forces the original filename on save.
 */
export async function GET(_request: Request, { params }: Ctx) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const supabase = createServiceClient();
  const { data: build, error } = await supabase
    .from("naasify_user_builds")
    .select("file_key, file_name")
    .eq("id", id)
    .single();
  if (error || !build) {
    return NextResponse.json({ error: "Build not found" }, { status: 404 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(BUILDS_BUCKET)
    .createSignedUrl(build.file_key as string, 60, {
      download: (build.file_name as string) || true,
    });
  if (signError || !signed?.signedUrl) {
    return NextResponse.json(
      { error: signError?.message ?? "Could not create download link" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed.signedUrl);
}
