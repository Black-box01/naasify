import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requestStatusSchema } from "@/lib/validation";
import { REQUEST_STATUS_LABELS } from "@/lib/service-requests";
import { sendEmail } from "@/lib/email/resend";
import { serviceRequestStatusEmail } from "@/lib/email/templates";
import type { Profile, ServiceRequestWithUser } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Move a request through pending -> approved -> fulfilled (or rejected) and
 * record an optional admin note. The requester is emailed the outcome on a
 * best-effort basis; the row update is the source of truth.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = requestStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid status" },
      { status: 400 },
    );
  }
  const { status, admin_note } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("naasify_service_requests")
    .update({ status, admin_note: admin_note ?? null })
    .eq("id", id)
    .select("*, service:naasify_services(id, name)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const updated = data as ServiceRequestWithUser;
  const statusLabel = REQUEST_STATUS_LABELS[status];
  const serviceName = updated.service?.name || "Service";

  const { data: profile } = await supabase
    .from("naasify_profiles")
    .select("id, email, full_name")
    .eq("id", updated.user_id)
    .single();
  const requester = profile as Pick<Profile, "id" | "email" | "full_name"> | null;
  if (requester?.email) {
    await sendEmail({
      to: requester.email,
      subject: `[NAASIFY] Your ${serviceName} request is ${statusLabel}`,
      html: serviceRequestStatusEmail({
        name: requester.full_name,
        serviceName,
        statusLabel,
        adminNote: admin_note ?? null,
      }),
    });
  }

  return NextResponse.json({ request: updated });
}

/** Delete a request outright (admin only). */
export async function DELETE(_request: Request, { params }: Ctx) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("naasify_service_requests")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
