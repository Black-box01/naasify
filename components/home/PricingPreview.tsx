import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { getBundlePlans } from "@/lib/pricing";
import { getNgnPerUsd } from "@/lib/fx";
import { convert, formatMoney } from "@/lib/money";

/**
 * Home-page teaser: the three annual bundle tiers (middle = highlighted
 * All-in-One), shown in USD at the live rate. Full toggles live on /pricing.
 */
export async function PricingPreview() {
  const [bundles, rate] = await Promise.all([getBundlePlans("annual"), getNgnPerUsd()]);
  if (bundles.length === 0) return null;

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          Bundles that <span className="text-gradient">scale with you</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-foreground/60">
          Annual bundle pricing, shown in USD. Prefer naira or a different
          billing cycle? Toggle everything on the pricing page.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        {bundles.map((plan) => {
          const usd = convert(Number(plan.price), plan.currency, "USD", rate);
          return (
            <div
              key={plan.id}
              className={`glass shadow-layered relative flex flex-col rounded-3xl p-7 transition-transform duration-300 ${
                plan.is_highlighted
                  ? "shadow-layered-lg ring-2 ring-brand-400/60 lg:scale-[1.04]"
                  : "hover:-translate-y-1"
              }`}
            >
              {plan.is_highlighted && (
                <span className="pill absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-500 to-accent-500 px-4 py-1 text-xs font-bold text-white shadow-layered">
                  Most Popular
                </span>
              )}
              <h3 className="font-display text-lg font-bold text-foreground">{plan.name}</h3>
              <p className="mt-3">
                <span className="font-display text-4xl font-extrabold text-foreground">
                  {formatMoney(usd, "USD")}
                </span>
                <span className="text-sm text-foreground/50"> / year</span>
              </p>
              {plan.currency === "NGN" && (
                <p className="mt-1 text-xs text-foreground/40">
                  ≈ {formatMoney(Number(plan.price), "NGN")} / year
                </p>
              )}
              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.slice(0, 6).map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground/65">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className={`pill mt-8 inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold transition-all ${
                  plan.is_highlighted
                    ? "btn-shine bg-gradient-to-r from-brand-500 via-brand-400 to-accent-500 text-white shadow-layered hover:brightness-110"
                    : "glass text-foreground hover:bg-foreground/10"
                }`}
              >
                Choose {plan.name}
                <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
