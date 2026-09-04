import type { BillingCycle } from "@/lib/types";

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
