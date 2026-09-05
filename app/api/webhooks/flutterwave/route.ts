import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { verifyWebhookHash } from "@/lib/flutterwave";
import { confirmAndActivate } from "@/lib/orders";

export const dynamic = "force-dynamic";

type FlutterwaveEvent = {
  event?: string;
  data?: {
    id?: string | number;
    tx_ref?: string;
    status?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

/**
 * Flutterwave webhook. Contract (mirrors the Paystack route):
 *   1. Read the RAW body, verify the `verif-hash` header (plain equality with
 *      FLW_SECRET_HASH — NOT an HMAC). Bad hash → 401, no DB writes.
 *   2. Idempotency gate: upsert the event by a stable id with `ignoreDuplicates`
 *      (ON CONFLICT DO NOTHING). 0 rows back ⇒ already seen ⇒ 200 immediately
 *      (Flutterwave retries).
 *   3. Ignore anything but a successful charge.completed (200, marked 'ignored').
 *   4. charge.completed + successful → confirmAndActivate (itself idempotent, and
 *      it re-verifies by transaction id) then mark 'processed'; on error mark
 *      'failed' but still 200 so a valid, recorded event is not retried forever.
 *
 * The proxy matcher excludes api/webhooks, so the raw body reaches us untouched.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifyWebhookHash(request.headers.get("verif-hash"))) {
    return NextResponse.json({ error: "Invalid hash" }, { status: 401 });
  }

  let payload: FlutterwaveEvent;
  try {
    payload = JSON.parse(rawBody) as FlutterwaveEvent;
  } catch {
    // Valid hash but unparseable body — nothing to do.
    return NextResponse.json({ received: false }, { status: 200 });
  }

  const eventType = payload.event ?? "unknown";
  const data = payload.data;
  const txRef = data?.tx_ref ?? null;
  const providerId = data?.id ?? null;
  // Prefer the transaction id; fall back to tx_ref, then a timestamp.
  const eventId = `${eventType}:${String(providerId ?? txRef ?? Date.now())}`;

  const supabase = createServiceClient();

  // 2) Idempotency gate.
  const { data: inserted } = await supabase
    .from("naasify_flutterwave_events")
    .upsert(
      { event_id: eventId, event_type: eventType, payload, status: "received" },
      { onConflict: "event_id", ignoreDuplicates: true },
    )
    .select("event_id");

  if (!inserted || inserted.length === 0) {
    // Duplicate delivery — already recorded and handled.
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  // 3) Only a successful charge.completed activates a subscription.
  if (
    eventType !== "charge.completed" ||
    data?.status !== "successful" ||
    !txRef
  ) {
    await supabase
      .from("naasify_flutterwave_events")
      .update({ status: "ignored", processed_at: new Date().toISOString() })
      .eq("event_id", eventId);
    return NextResponse.json({ received: true, ignored: true }, { status: 200 });
  }

  // 4) Activate. confirmAndActivate re-verifies with Flutterwave by transaction
  //    id, so the webhook body is never trusted for the amount/status.
  try {
    await confirmAndActivate(txRef, payload as Record<string, unknown>, {
      providerTransactionId: providerId != null ? String(providerId) : undefined,
    });
    await supabase
      .from("naasify_flutterwave_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("event_id", eventId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(
      `[webhook:flutterwave] processing failed for ${eventId}: ${message}`,
    );
    await supabase
      .from("naasify_flutterwave_events")
      .update({
        status: "failed",
        error: message,
        processed_at: new Date().toISOString(),
      })
      .eq("event_id", eventId);
  }

  // Always 200 for a validly signed event: the callback page is the safety net
  // for activation, and non-2xx would trigger endless Flutterwave retries.
  return NextResponse.json({ received: true }, { status: 200 });
}
