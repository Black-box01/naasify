import type { Metadata } from "next";
import { PricingCards, type ServicePlans } from "@/components/pricing/PricingCards";
import { CheckoutErrorBanner } from "@/components/checkout/CheckoutErrorBanner";
import { AnimatedGradient } from "@/components/effects/AnimatedGradient";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getActivePlans,
  getActiveServices,
  getBundlePlans,
} from "@/lib/pricing";
import { getNgnPerUsd } from "@/lib/fx";
import { getCurrentUser } from "@/lib/auth";
import { BILLING_CYCLES } from "@/lib/constants";
import { breadcrumbJsonLd, buildMetadata, pricingJsonLd } from "@/lib/seo";
import type { BillingCycle } from "@/lib/types";

export const metadata: Metadata = buildMetadata({
  title: "Pricing",
  description:
    "Transparent quarterly, half-yearly and annual pricing for every NAASIFY cloud service. View in USD or naira — no hidden fees, cancel anytime.",
  path: "/pricing",
  keywords: [
    "NAASIFY pricing",
    "cloud service pricing",
    "hosting plans",
    "annual hosting",
    "pay in naira",
    "BaaS pricing",
  ],
});

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ cycle?: string; error?: string }>;
}) {
  const params = await searchParams;
  const requested = params.cycle as BillingCycle | undefined;
  const cycle: BillingCycle =
    requested && BILLING_CYCLES.includes(requested) ? requested : "annual";

  const [services, plans, bundles, rate, current] = await Promise.all([
    getActiveServices(),
    getActivePlans(cycle),
    getBundlePlans(cycle),
    getNgnPerUsd(),
    getCurrentUser(),
  ]);

  // Group per-service plans in service display order; skip services with none.
  const servicePlans: ServicePlans[] = services
    .map((service) => ({
      service,
      plans: plans.filter((plan) => plan.service_id === service.id),
    }))
    .filter((group) => group.plans.length > 0);

  const authenticated = !!current;

  return (
    <div className="relative">
      <section className="relative overflow-hidden pb-8 pt-16 sm:pt-20">
        <AnimatedGradient orbs={false} />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Pricing that <span className="text-gradient">scales with you</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-foreground/60 sm:text-lg">
            Choose a billing cycle and a currency. Every plan below is exactly
            what our team has published — no hidden fees, cancel anytime.
          </p>
        </div>
      </section>

      <div className="pb-24 pt-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <CheckoutErrorBanner code={params.error} />
        </div>
        <PricingCards
          cycle={cycle}
          bundles={bundles}
          servicePlans={servicePlans}
          rate={rate}
          authenticated={authenticated}
        />
      </div>

      <JsonLd data={pricingJsonLd([...bundles, ...plans])} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Pricing", path: "/pricing" },
        ])}
      />
    </div>
  );
}
