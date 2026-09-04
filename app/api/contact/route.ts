import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { contactSchema } from "@/lib/validation";
import { sendEmail } from "@/lib/email/resend";
import {
  contactAdminEmail,
  contactConfirmationEmail,
} from "@/lib/email/templates";
import { CONTACT_EMAIL } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Best-effort in-memory rate limit: <=3 submissions per 10 minutes per IP. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0];
    if (first) return first.trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many messages. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the form fields." },
      { status: 400 },
    );
  }
  const { name, email, subject, message } = parsed.data;

  // 1) Persist FIRST via the anon/authenticated RLS insert policy. The DB row
  //    is the source of truth, so a Resend outage can never lose a message.
  const supabase = await createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("naasify_contact_messages")
    .insert({ name, email, subject: subject ?? null, message })
    .select()
    .single();

  if (error || !row) {
    console.error("[contact] insert failed:", error?.message ?? error);
    return NextResponse.json(
      { error: "Could not save your message. Please try again." },
      { status: 500 },
    );
  }

  // 2) Notify info@naasify.com and confirm to the sender. Failures are logged
  //    but never block the success response.
  const [adminRes, confirmRes] = await Promise.all([
    sendEmail({
      to: CONTACT_EMAIL,
      subject: `New message from ${name}${subject ? ` — ${subject}` : ""}`,
      html: contactAdminEmail({ name, email, subject, message }),
      replyTo: email,
    }),
    sendEmail({
      to: email,
      subject: "We received your message — NAASIFY",
      html: contactConfirmationEmail({ name }),
    }),
  ]);
  if (confirmRes.error) {
    console.log(`[contact] confirmation email skipped: ${confirmRes.error}`);
  }

  const emailed = !adminRes.error;

  // 3) Record delivery. Non-admins can't UPDATE their own row (RLS), so this
  //    best-effort write uses the service client.
  if (emailed) {
    const admin = createServiceClient();
    const { error: updateError } = await admin
      .from("naasify_contact_messages")
      .update({ email_sent: true })
      .eq("id", row.id as string);
    if (updateError) {
      console.log(`[contact] email_sent flag not persisted: ${updateError.message}`);
    }
  }

  return NextResponse.json({ success: true, emailed });
}
