import Link from "next/link";
import { AnimatedGradient } from "@/components/effects/AnimatedGradient";
import { Icon } from "@/components/ui/icons";

const STATS = [
  { value: "9", label: "Cloud services" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "5 min", label: "To first deploy" },
  { value: "24/7", label: "Human support" },
];

/** Hero: animated gradient backdrop, gradient headline, pill CTAs, trust stats. */
export function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-16 sm:pb-28 sm:pt-24">
      <AnimatedGradient />
      <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
        <span className="pill glass inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-accent-300 sm:text-sm">
          <Icon name="sparkle" className="h-4 w-4" />
          Backend-as-a-Service, rebuilt for 2026
        </span>

        <h1 className="font-display mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-6xl">
          Ship your product on{" "}
          <span className="text-gradient">infrastructure that just works</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base text-foreground/60 sm:text-lg">
          Hosting, databases, storage, SMTP, domains, VPS and more — published
          as simple quarterly, half-yearly and annual plans. One checkout,
          instant activation, zero DevOps hires.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/pricing"
            className="btn-shine pill inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 via-brand-400 to-accent-500 px-8 py-3.5 text-base font-semibold text-white shadow-layered transition-all hover:brightness-110"
          >
            View pricing
            <Icon name="arrow-right" className="h-4 w-4" />
          </Link>
          <Link
            href="/contact"
            className="glass pill inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-foreground/10"
          >
            Talk to us
          </Link>
        </div>

        <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="glass shadow-layered rounded-2xl px-4 py-5">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="font-display block text-2xl font-bold text-foreground">
                  {stat.value}
                </span>
                <span className="mt-1 block text-xs text-foreground/50">{stat.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
