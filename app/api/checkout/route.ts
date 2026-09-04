import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validation";
import { createOrder } from "@/lib/orders";
import type { Plan } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Start a Paystack checkout for a plan.
 *
 * - Optional session: signed-in users check out with their account email;
 *   guests must supply an email (used for the receipt + order record).
 * - The amount is recomputed server-side from the DB plan (see lib/orders.ts);
 *   the client never sends a price.
 * - Only ACTIVE plans can be purchased — RLS + an explicit filter double-check.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid checkout request." },
      { status: 400 },
    );
  }
  const { planId, email: guestEmail } = parsed.data;

  const current = await getCurrentUser();
  const email = (current?.user.email ?? guestEmail ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { error: "An email address is required to check out." },
      { status: 400 },
    );
  }

  // Load the plan through the user-scoped client so RLS hides inactive plans.
  const supabase = await createSupabaseServerClient();
  const { data: plan } = await supabase
    .from("naasify_plans")
    .select("*")
    .eq("id", planId)
    .eq("is_active", true)
    .maybeSingle();

  if (!plan) {
    return NextResponse.json(
      { error: "That plan is no longer available." },
      { status: 404 },
    );
  }

  try {
    const result = await createOrder({
      plan: plan as Plan,
      userId: current?.user.id ?? null,
      email,
    });
    return NextResponse.json({
      authorization_url: result.authorization_url,
      reference: result.reference,
    });
  } catch (error) {
    console.error("[checkout] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
