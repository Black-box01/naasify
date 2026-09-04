import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/paystack";
import { confirmAndActivate } from "@/lib/orders";

export const dynamic = "force-dynamic";

type PaystackEvent = {
  event?: string;
  id?: string | number;
  data?: {
    id?: string | number;
    reference?: string;
    status?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

/**
 * Paystack webhook. Contract:
 *   1. Read the RAW body first, verify x-paystack-signature (HMAC-SHA512).
 *      Bad signature → 401, no DB writes.
 *   2. Idempotency gate: insert the event by its unique id with
 *      `ignoreDuplicates` (ON CONFLICT DO NOTHING). 0 rows back ⇒ already seen
 *      ⇒ 200 immediately (Paystack retries aggressively).
 *   3. Ignore non-charge.success events (200, marked 'ignored').
 *   4. charge.success → confirmAndActivate (itself idempotent) then mark the
 *      event 'processed'; on error mark it 'failed' but still 200 so Paystack
 *      does not retry a valid, recorded event forever.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: PaystackEvent;
  try {
    payload = JSON.parse(rawBody) as PaystackEvent;
  } catch {
    // Valid signature but unparseable body — nothing to do.
    return NextResponse.json({ received: false }, { status: 200 });
  }

  const eventType = payload.event ?? "unknown";
  const reference = payload.data?.reference ?? null;
  // Prefer Paystack's own event id; fall back to the charge id, then reference.
  const uniqueId = payload.id ?? payload.data?.id ?? reference;
  const eventId = `${eventType}:${String(uniqueId ?? Date.now())}`;

  const supabase = createServiceClient();

  // 2) Idempotency gate.
  const { data: inserted } = await supabase
    .from("naasify_paystack_events")
    .upsert(
      { event_id: eventId, event_type: eventType, payload, status: "received" },
      { onConflict: "event_id", ignoreDuplicates: true },
    )
    .select("event_id");

  if (!inserted || inserted.length === 0) {
    // Duplicate delivery — already recorded and handled.
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  // 3) Only charge.success activates a subscription.
  if (eventType !== "charge.success" || !reference) {
    await supabase
      .from("naasify_paystack_events")
      .update({ status: "ignored", processed_at: new Date().toISOString() })
      .eq("event_id", eventId);
    return NextResponse.json({ received: true, ignored: true }, { status: 200 });
  }

  // 4) Activate. confirmAndActivate re-verifies with Paystack directly, so the
  //    webhook body is never trusted for the amount/status.
  try {
    await confirmAndActivate(reference, payload as Record<string, unknown>);
    await supabase
      .from("naasify_paystack_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("event_id", eventId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`[webhook] processing failed for ${eventId}: ${message}`);
    await supabase
      .from("naasify_paystack_events")
      .update({
        status: "failed",
        error: message,
        processed_at: new Date().toISOString(),
      })
      .eq("event_id", eventId);
  }

  // Always 200 for a validly signed event: the callback page is the safety net
  // for activation, and non-2xx would trigger endless Paystack retries.
  return NextResponse.json({ received: true }, { status: 200 });
}
