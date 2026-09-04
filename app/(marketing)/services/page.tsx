import type { Metadata } from "next";
import Link from "next/link";
import { AnimatedGradient } from "@/components/effects/AnimatedGradient";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { Icon } from "@/components/ui/icons";
import { getActiveServices } from "@/lib/pricing";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Services — ${SITE_NAME}`,
  description:
    "Hosting, databases, email, storage, domains, compute, VPS and VPN — every cloud service your product needs, on one NAASIFY subscription.",
};

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await getActiveServices();

  return (
    <div className="relative">
      <section className="relative overflow-hidden pb-4 pt-8 sm:pt-12">
        <AnimatedGradient orbs={false} />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="pill glass inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-accent-300">
            <Icon name="layers" className="h-4 w-4" />
            Our services
          </span>
          <h1 className="font-display mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Everything your product needs to{" "}
            <span className="text-gradient">ship</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-foreground/60 sm:text-lg">
            Backend &amp; frontend hosting, SMTP emailing, databases, storage,
            domain names, cloud computing, VPS and VPN — each published with
            quarterly, half-yearly and annual plans, or grab the All-in-One
            bundle.
          </p>
        </div>
      </section>

      {services.length === 0 ? (
        <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="glass mt-4 rounded-3xl p-12 text-center">
            <p className="text-foreground/60">
              No services are published yet. Please check back soon.
            </p>
          </div>
        </div>
      ) : (
        <>
          <ServicesGrid services={services} heading={false} />
          <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
            <div className="glass shadow-layered flex flex-col items-center gap-4 rounded-3xl p-10 text-center">
              <h2 className="font-display text-2xl font-bold text-foreground">
                Ready to get started?
              </h2>
              <p className="max-w-xl text-foreground/60">
                Compare plans and pricing across every service, or take the
                All-in-One bundle and get it all under one subscription.
              </p>
              <Link
                href="/pricing"
                className="pill mt-1 inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3 text-sm font-semibold text-white shadow-layered transition-all hover:brightness-110"
              >
                View pricing
                <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
