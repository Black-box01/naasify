import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { startCheckoutSchema } from "@/lib/validation";
import { createOrder } from "@/lib/orders";
import { safeNextPath } from "@/lib/redirect";
import type { Plan } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Login-gated purchase launcher. A signed-in buyer is charged immediately: this
 * creates a pending order and 302-redirects straight to the gateway's hosted
 * checkout (Flutterwave or Paystack, chosen in lib/payments.ts) — no intermediate
 * UI, and it never returns to /pricing on success. A signed-out visitor is sent
 * to /login with a ?next that resumes THIS exact purchase after they sign in.
 *
 * GET (not POST) so the whole flow is a single navigation the browser follows.
 */
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const parsed = startCheckoutSchema.safeParse({
    planId: params.get("planId"),
    return: params.get("return") ?? undefined,
  });

  // Bounce target for a recoverable error: a safe ?return, else /pricing.
  const fallback = safeNextPath(params.get("return")) ?? "/pricing";
  const bounce = (code: string, base = fallback) => {
    const url = new URL(base, request.url);
    url.searchParams.set("error", code);
    return NextResponse.redirect(url);
  };

  if (!parsed.success) return bounce("invalid_plan");

  const { planId } = parsed.data;
  const returnTo = safeNextPath(parsed.data.return) ?? "/pricing";

  const current = await getCurrentUser();
  if (!current) {
    // Require login, then resume this purchase (never back to /pricing).
    const next = `/checkout/start?planId=${encodeURIComponent(planId)}&return=${encodeURIComponent(returnTo)}`;
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(next)}`, request.url),
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
  if (!plan) return bounce("plan_unavailable", returnTo);

  try {
    const result = await createOrder({
      plan: plan as Plan,
      userId: current.user.id,
      email: current.user.email ?? "",
      customerName: current.profile?.full_name ?? undefined,
    });
    // 303 See Other: the browser follows the gateway URL with a fresh GET.
    return NextResponse.redirect(result.authorization_url, 303);
  } catch (error) {
    console.error(
      "[checkout/start] failed:",
      error instanceof Error ? error.message : error,
    );
    return bounce("checkout_failed", returnTo);
  }
}
