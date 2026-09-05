import type { BillingCycle, BuildStatus } from "@/lib/types";

export const SITE_NAME = "NAASIFY";
export const SITE_TAGLINE = "Everything your product needs to ship — one platform.";
export const CONTACT_EMAIL = process.env.CONTACT_TO_EMAIL || "info@naasify.online";

export const BILLING_CYCLES: BillingCycle[] = ["quarterly", "half_yearly", "annual"];

export const CYCLE_LABELS: Record<BillingCycle, string> = {
  quarterly: "Quarterly",
  half_yearly: "Half-Yearly",
  annual: "Annual",
};

/** Subscription length in months per billing cycle (used for ends_at). */
export const CYCLE_MONTHS: Record<BillingCycle, number> = {
  quarterly: 3,
  half_yearly: 6,
  annual: 12,
};

/** Private Supabase Storage bucket for user project builds. */
export const BUILDS_BUCKET = "user-builds";

/** Days before ends_at that the expiry cron starts sending renewal reminders. */
export const EXPIRY_WARNING_DAYS = 7;

export const BUILD_STATUS_LABELS: Record<BuildStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Deployed",
};

/**
 * Recoverable checkout errors surfaced via `?error=` on /pricing and /dashboard
 * after a /checkout/start bounce. Unknown codes render nothing.
 */
export const CHECKOUT_ERROR_MESSAGES: Record<string, string> = {
  plan_unavailable: "That plan is no longer available.",
  checkout_failed: "We couldn't start checkout. Please try again.",
  invalid_plan: "That plan link is invalid.",
};
