"use client";

import { useState } from "react";
import { CycleToggle } from "@/components/pricing/CycleToggle";
import { CurrencyToggle } from "@/components/pricing/CurrencyToggle";
import { BuyButton } from "@/components/pricing/BuyButton";
import { Icon, type IconName } from "@/components/ui/icons";
import { convert, formatMoney } from "@/lib/money";
import type { BillingCycle, CurrencyCode, Plan, Service } from "@/lib/types";

const CYCLE_SUFFIX: Record<BillingCycle, string> = {
  quarterly: "/ quarter",
  half_yearly: "/ half-year",
  annual: "/ year",
};

export interface ServicePlans {
  service: Service;
  plans: Plan[];
}

function PlanCard({
  plan,
  cycle,
  currency,
  rate,
  email,
}: {
  plan: Plan;
  cycle: BillingCycle;
  currency: CurrencyCode;
  rate: number;
  email: string | null;
}) {
  const amount = convert(Number(plan.price), plan.currency, currency, rate);
  const showAlt = currency !== plan.currency;
  const suffix = CYCLE_SUFFIX[cycle];

  return (
    <div
      className={`glass shadow-layered relative flex flex-col rounded-3xl p-7 transition-all duration-300 ${
        plan.is_highlighted
          ? "shadow-layered-lg ring-2 ring-brand-400/60 lg:scale-[1.04]"
          : "hover:-translate-y-1"
      }`}
    >
      {plan.is_highlighted && (
        <span className="pill absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-brand-500 to-accent-500 px-4 py-1 text-xs font-bold text-white shadow-layered">
          Most Popular
        </span>
      )}

      <h3 className="font-display text-lg font-bold text-foreground">{plan.name}</h3>

      <p className="mt-4 flex items-baseline gap-1.5">
        <span className="font-display text-4xl font-extrabold text-foreground">
          {formatMoney(amount, currency)}
        </span>
        <span className="text-sm text-foreground/50">{suffix}</span>
      </p>
      {showAlt && (
        <p className="mt-1 text-xs text-foreground/40">
          ≈ {formatMoney(Number(plan.price), plan.currency)} {suffix}
        </p>
      )}

      {plan.features.length > 0 && (
        <ul className="mt-6 flex-1 space-y-2.5">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm text-foreground/65"
            >
              <Icon
                name="check"
                className="mt-0.5 h-4 w-4 shrink-0 text-accent-400"
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}
      {plan.features.length === 0 && <div className="flex-1" />}

      <div className="mt-8">
        <BuyButton
          planId={plan.id}
          planName={plan.name}
          email={email}
          variant={plan.is_highlighted ? "primary" : "glass"}
        />
      </div>
    </div>
  );
}

/**
 * The whole /pricing interactive island: billing-cycle + currency toggles,
 * the bundle tier row (middle = All-in-One) and one section per service.
 * All plan data and the FX rate are passed from the server (zero client fetch).
 */
export function PricingCards({
  cycle,
  bundles,
  servicePlans,
  rate,
  email,
}: {
  cycle: BillingCycle;
  bundles: Plan[];
  servicePlans: ServicePlans[];
  rate: number;
  email: string | null;
}) {
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const hasContent = bundles.length > 0 || servicePlans.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
        <CycleToggle cycle={cycle} />
        <CurrencyToggle currency={currency} onChange={setCurrency} />
      </div>

      {!hasContent && (
        <p className="mt-16 text-center text-foreground/50">
          No plans published yet. Check back soon.
        </p>
      )}

      {bundles.length > 0 && (
        <section className="mt-16">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              All-in-One <span className="text-gradient">bundles</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-foreground/55">
              Every service in one subscription. The All-in-One tier is our most
              popular pick.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
            {bundles.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                cycle={cycle}
                currency={currency}
                rate={rate}
                email={email}
              />
            ))}
          </div>
        </section>
      )}

      {servicePlans.map(({ service, plans }) => (
        <section key={service.id} className="mt-20">
          <div className="flex items-center gap-3">
            <span className="pill inline-flex bg-gradient-to-br from-brand-500/25 to-accent-500/25 p-3 text-accent-300">
              <Icon
                name={(service.icon_key || "box") as IconName}
                className="h-5 w-5"
              />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
                {service.name}
              </h2>
              {service.description && (
                <p className="text-sm text-foreground/50">{service.description}</p>
              )}
            </div>
          </div>
          <div className="mt-8 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                cycle={cycle}
                currency={currency}
                rate={rate}
                email={email}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
