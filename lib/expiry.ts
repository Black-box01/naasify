import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import {
  expiringSubscriptionsAdminEmail,
  subscriptionExpiryEmail,
} from "@/lib/email/templates";
import { CONTACT_EMAIL, EXPIRY_WARNING_DAYS } from "@/lib/constants";
import { daysUntil } from "@/lib/utils";
import type { BillingCycle } from "@/lib/types";

/**
 * SERVER-ONLY. Subscription-expiry scanning + notification logic shared by the
 * daily Vercel Cron (/api/cron/expiring) and the admin "Expiring" widget.
 * Never import from a "use client" component (uses the service-role key).
 */

export interface ExpiringRow {
  subscriptionId: string;
  userId: string | null;
  email: string | null;
  name: string | null;
  planName: string;
  cycle: BillingCycle | null;
  endsAt: string;
  daysLeft: number;
  /** True once a renewal reminder has already been emailed for this window. */
  alreadyNotified: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Active subscriptions whose ends_at falls within the next `days` days,
 * enriched with the plan and the best available contact (profile email, else the
 * order's guest email). Sorted soonest-first.
 */
export async function fetchExpiringSubscriptions(
  days: number = EXPIRY_WARNING_DAYS,
): Promise<ExpiringRow[]> {
  const supabase = createServiceClient();
  const now = Date.now();
  const windowEnd = new Date(now + days * DAY_MS).toISOString();

  const { data } = await supabase
    .from("naasify_subscriptions")
    .select(
      "id, user_id, ends_at, expiry_notified_at, plan:naasify_plans(name, billing_cycle), order:naasify_orders(email)",
    )
    .eq("status", "active")
    .gte("ends_at", new Date(now).toISOString())
    .lte("ends_at", windowEnd)
    .order("ends_at", { ascending: true });

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    user_id: string | null;
    ends_at: string;
    expiry_notified_at: string | null;
    plan?: { name: string; billing_cycle: BillingCycle } | null;
    order?: { email: string } | null;
  }>;

  // Resolve names/emails from profiles for real accounts; fall back to the
  // order's guest email when the subscription has no linked user.
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
  const profileMap = new Map<string, { email: string; full_name: string | null }>();
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from("naasify_profiles")
      .select("id, email, full_name")
      .in("id", userIds);
    for (const p of (profiles ?? []) as Array<{
      id: string;
      email: string;
      full_name: string | null;
    }>) {
      profileMap.set(p.id, { email: p.email, full_name: p.full_name });
    }
  }

  return rows.map((r) => {
    const profile = r.user_id ? profileMap.get(r.user_id) : undefined;
    return {
      subscriptionId: r.id,
      userId: r.user_id,
      email: profile?.email ?? r.order?.email ?? null,
      name: profile?.full_name ?? null,
      planName: r.plan?.name ?? "Subscription",
      cycle: r.plan?.billing_cycle ?? null,
      endsAt: r.ends_at,
      daysLeft: daysUntil(r.ends_at),
      alreadyNotified: Boolean(r.expiry_notified_at),
    };
  });
}

export interface ExpiryJobResult {
  expiring: number;
  notified: number;
  expired: number;
  digestSent: boolean;
}

/**
 * Daily cron core:
 *  1. Email each soon-to-expire user once per window (deduped via
 *     expiry_notified_at so nobody gets 7 identical reminders).
 *  2. Flip already-overdue "active" subscriptions to "expired".
 *  3. Send the admin a single digest of everything expiring in the window.
 */
export async function runExpiryJob(): Promise<ExpiryJobResult> {
  const supabase = createServiceClient();
  const expiring = await fetchExpiringSubscriptions();

  // 1. User renewal reminders (skip anyone already emailed for this window).
  let notified = 0;
  for (const row of expiring) {
    if (row.alreadyNotified || !row.email) continue;
    const { error } = await sendEmail({
      to: row.email,
      subject: `Your NAASIFY plan expires in ${row.daysLeft} day${row.daysLeft === 1 ? "" : "s"}`,
      html: subscriptionExpiryEmail({
        name: row.name,
        planName: row.planName,
        endsAt: row.endsAt,
        daysLeft: row.daysLeft,
      }),
    });
    if (!error) {
      notified += 1;
      await supabase
        .from("naasify_subscriptions")
        .update({ expiry_notified_at: new Date().toISOString() })
        .eq("id", row.subscriptionId);
    }
  }

  // 2. Overdue but still flagged active -> expired (keeps the dashboard honest).
  const { data: overdue } = await supabase
    .from("naasify_subscriptions")
    .select("id")
    .eq("status", "active")
    .lt("ends_at", new Date().toISOString());
  const overdueIds = (overdue ?? []).map((r) => r.id as string);
  let expired = 0;
  if (overdueIds.length) {
    const { error } = await supabase
      .from("naasify_subscriptions")
      .update({ status: "expired" })
      .in("id", overdueIds);
    if (!error) expired = overdueIds.length;
  }

  // 3. One admin digest summarising the whole expiring list.
  let digestSent = false;
  if (expiring.length) {
    const { error } = await sendEmail({
      to: CONTACT_EMAIL,
      subject: `[NAASIFY] ${expiring.length} subscription${expiring.length === 1 ? "" : "s"} expiring within ${EXPIRY_WARNING_DAYS} days`,
      html: expiringSubscriptionsAdminEmail({
        days: EXPIRY_WARNING_DAYS,
        items: expiring.map((r) => ({
          name: r.name,
          email: r.email ?? "—",
          planName: r.planName,
          endsAt: r.endsAt,
          daysLeft: r.daysLeft,
        })),
      }),
    });
    digestSent = !error;
  }

  return { expiring: expiring.length, notified, expired, digestSent };
}
