import { createServiceClient } from "@/lib/supabase/admin";
import { getNgnPerUsd } from "@/lib/fx";
import {
  initializeTransaction,
  makeReference,
  verifyTransaction,
} from "@/lib/paystack";
import { sendEmail } from "@/lib/email/resend";
import { paymentReceiptEmail } from "@/lib/email/templates";
import { CYCLE_MONTHS } from "@/lib/constants";
import { addMonths } from "@/lib/utils";
import type { BillingCycle, CurrencyCode, Plan } from "@/lib/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * NGN kobo to charge for a plan. USD-stored plans are converted at the live
 * (or fallback) rate. The server — never the client — decides this number.
 */
function planAmountKobo(plan: Plan, ngnPerUsd: number): { amountNgn: number; kobo: number } {
  const price = Number(plan.price);
  const amountNgn = plan.currency === "USD" ? price * ngnPerUsd : price;
  return { amountNgn, kobo: Math.round(amountNgn * 100) };
}

/**
 * Create a pending order (amount recomputed from the DB plan) and start a
 * Paystack charge. Returns the hosted-checkout URL to redirect the buyer to.
 */
export async function createOrder({
  plan,
  userId,
  email,
}: {
  plan: Plan;
  userId: string | null;
  email: string;
}): Promise<{ authorization_url: string; reference: string; orderId: string }> {
  const ngnPerUsd = await getNgnPerUsd();
  const { amountNgn, kobo } = planAmountKobo(plan, ngnPerUsd);
  const reference = makeReference();

  const supabase = createServiceClient();
  const { data: order, error } = await supabase
    .from("naasify_orders")
    .insert({
      user_id: userId,
      plan_id: plan.id,
      email,
      billing_cycle: plan.billing_cycle,
      amount: amountNgn.toFixed(2),
      currency: "NGN",
      paystack_reference: reference,
      status: "pending",
    })
    .select()
    .single();
  if (error || !order) {
    throw new Error(error?.message || "Could not create the order");
  }

  const init = await initializeTransaction({
    email,
    amountKobo: kobo,
    reference,
    callbackUrl: `${APP_URL}/checkout/callback?reference=${encodeURIComponent(reference)}`,
    metadata: { order_id: order.id as string, plan_name: plan.name },
  });

  return {
    authorization_url: init.authorization_url,
    reference,
    orderId: order.id as string,
  };
}

export type ConfirmResult =
  | { status: "paid"; orderId: string }
  | { status: "pending" }
  | { status: "not_found" };

type OrderWithPlan = {
  id: string;
  user_id: string | null;
  plan_id: string;
  email: string;
  billing_cycle: BillingCycle;
  amount: string;
  currency: string;
  status: string;
  plan: Plan | null;
};

/**
 * Verify a charge with Paystack and, if successful, activate it — used by BOTH
 * the webhook and the callback page. Idempotent by construction:
 *   1. conditional UPDATE ... WHERE status <> 'paid' (0 rows ⇒ already paid)
 *   2. subscriptions.order_id UNIQUE (duplicate insert is a no-op)
 * A receipt email fires only on the transition to paid.
 */
export async function confirmAndActivate(
  reference: string,
  rawEvent?: Record<string, unknown>,
): Promise<ConfirmResult> {
  const supabase = createServiceClient();

  let txn;
  try {
    txn = await verifyTransaction(reference);
  } catch (error) {
    console.log(
      `[orders] verify failed for ${reference}: ${error instanceof Error ? error.message : "unknown"}`,
    );
    return { status: "pending" };
  }
  if (txn.status !== "success") {
    return { status: "pending" };
  }

  const { data: order } = await supabase
    .from("naasify_orders")
    .select("*, plan:naasify_plans(*)")
    .eq("paystack_reference", reference)
    .maybeSingle();
  if (!order) {
    console.log(`[orders] no order for verified reference ${reference}`);
    return { status: "not_found" };
  }
  const existing = order as OrderWithPlan;
  if (existing.status === "paid") {
    return { status: "paid", orderId: existing.id };
  }

  // 1) Conditional flip to paid — races lose here and become no-ops.
  const { data: updated } = await supabase
    .from("naasify_orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      raw_event: rawEvent ?? {},
    })
    .eq("paystack_reference", reference)
    .neq("status", "paid")
    .select()
    .maybeSingle();

  if (!updated) {
    // Someone else already activated it between our read and write.
    return { status: "paid", orderId: existing.id };
  }

  // 2) Insert the subscription; unique(order_id) makes a duplicate a no-op.
  const startsAt = new Date();
  const endsAt = addMonths(startsAt, CYCLE_MONTHS[existing.billing_cycle]);
  const { error: subError } = await supabase.from("naasify_subscriptions").insert({
    order_id: existing.id,
    user_id: existing.user_id,
    plan_id: existing.plan_id,
    status: "active",
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
  });
  if (subError && subError.code !== "23505") {
    console.error(`[orders] subscription insert failed: ${subError.message}`);
  }

  // 3) Fire-and-forget receipt (never blocks activation).
  void sendEmail({
    to: existing.email,
    subject: `Receipt — ${existing.plan?.name ?? "NAASIFY"}`,
    html: paymentReceiptEmail({
      planName: existing.plan?.name ?? "NAASIFY plan",
      amount: Number(existing.amount),
      currency: existing.currency as CurrencyCode,
      cycle: existing.billing_cycle,
      reference,
      endsAt: endsAt.toISOString(),
    }),
  });

  return { status: "paid", orderId: existing.id };
}
