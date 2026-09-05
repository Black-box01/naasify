import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEntitlements, checkRequest } from "@/lib/entitlements";
import { isAddOnSlug, REQUEST_CONFIGS, summarizeDetails } from "@/lib/service-requests";
import { sendEmail } from "@/lib/email/resend";
import { serviceRequestAdminEmail } from "@/lib/email/templates";
import { CONTACT_EMAIL } from "@/lib/constants";
import type { ServiceRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

const createRequestSchema = z.object({
  service_slug: z.string(),
  details: z.record(z.string(), z.unknown()),
});

/** The signed-in user's add-on service requests (newest first). */
export async function GET() {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("naasify_service_requests")
    .select("*")
    .eq("user_id", current.user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ requests: (data ?? []) as ServiceRequest[] });
}

/**
 * Submit an add-on service request.
 *
 * The server re-resolves the caller's plan entitlements and enforces
 * eligibility + remaining quota BEFORE inserting, so an ineligible client can
 * never create a request even by calling this route directly. The request's
 * `details` are validated against the same per-slug schema that drives the
 * dashboard form (lib/service-requests.ts), keeping UI and API in lock-step.
 */
export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { service_slug, details } = parsed.data;

  if (!isAddOnSlug(service_slug)) {
    return NextResponse.json({ error: "Unknown service" }, { status: 400 });
  }

  const config = REQUEST_CONFIGS[service_slug];
  const ent = await getEntitlements(current.user.id);
  const gate = checkRequest(ent, service_slug, config.title);
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 });

  const detailsParsed = config.schema.safeParse(details);
  if (!detailsParsed.success) {
    return NextResponse.json(
      { error: detailsParsed.error.issues[0]?.message ?? "Invalid details" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: service } = await supabase
    .from("naasify_services")
    .select("id, name")
    .eq("slug", service_slug)
    .eq("is_active", true)
    .single();
  if (!service) {
    return NextResponse.json(
      { error: "That service isn't available right now" },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("naasify_service_requests")
    .insert({
      user_id: current.user.id,
      service_id: service.id,
      service_slug,
      details: detailsParsed.data,
      status: "pending",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The row is the source of truth; the admin alert email is best-effort.
  const userEmail = current.user.email ?? "";
  await sendEmail({
    to: CONTACT_EMAIL,
    subject: `[NAASIFY] New ${service.name} request from ${userEmail}`,
    html: serviceRequestAdminEmail({
      userName: current.profile?.full_name,
      userEmail,
      serviceName: service.name,
      summary: summarizeDetails(service_slug, detailsParsed.data as Record<string, unknown>),
    }),
    replyTo: userEmail || undefined,
  });

  return NextResponse.json({ request: data as ServiceRequest });
}
