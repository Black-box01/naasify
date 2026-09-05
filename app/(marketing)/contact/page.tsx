import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { AnimatedGradient } from "@/components/effects/AnimatedGradient";
import { Icon } from "@/components/ui/icons";
import { JsonLd } from "@/components/seo/JsonLd";
import { CONTACT_EMAIL } from "@/lib/constants";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  description: `Questions about NAASIFY plans or a custom bundle? Email ${CONTACT_EMAIL} or send us a message — real humans, usually within one business day.`,
  path: "/contact",
  keywords: [
    "contact NAASIFY",
    "NAASIFY support",
    "cloud service support",
    "custom cloud bundle",
  ],
});

export default function ContactPage() {
  return (
    <div className="relative">
      <section className="relative overflow-hidden pb-6 pt-14 sm:pt-16">
        <AnimatedGradient orbs={false} />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Let&apos;s <span className="text-gradient">talk</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-foreground/60">
            Real humans, fast replies. Ask us anything about services, bundles,
            migrations or invoicing.
          </p>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 pb-24 pt-6 sm:px-6 lg:grid-cols-[1.15fr_0.85fr]">
        <ContactForm />

        <aside className="flex flex-col gap-5">
          <div className="glass shadow-layered rounded-3xl p-7">
            <h2 className="font-display text-lg font-bold text-foreground">
              Contact details
            </h2>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="pill mt-5 inline-flex w-full items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3 text-sm font-semibold text-white shadow-layered transition-all hover:brightness-110"
            >
              <Icon name="mail" className="h-4 w-4" />
              {CONTACT_EMAIL}
            </a>
            <ul className="mt-6 space-y-4 text-sm">
              <li className="flex items-start gap-3 text-foreground/65">
                <span className="pill mt-0.5 inline-flex bg-foreground/5 p-2 text-accent-300">
                  <Icon name="clock" className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-medium text-foreground">Fast responses</span>
                  Usually within one business day.
                </span>
              </li>
              <li className="flex items-start gap-3 text-foreground/65">
                <span className="pill mt-0.5 inline-flex bg-foreground/5 p-2 text-brand-300">
                  <Icon name="shield" className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-medium text-foreground">No spam, ever</span>
                  Your details stay private and secure.
                </span>
              </li>
              <li className="flex items-start gap-3 text-foreground/65">
                <span className="pill mt-0.5 inline-flex bg-foreground/5 p-2 text-accent-300">
                  <Icon name="layers" className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-medium text-foreground">Custom bundles</span>
                  Need a tailored plan? We&apos;ll build one with you.
                </span>
              </li>
            </ul>
          </div>

          <div className="animated-gradient-bg shadow-layered rounded-3xl p-7">
            <h3 className="font-display text-base font-bold text-foreground">
              Just browsing?
            </h3>
            <p className="mt-2 text-sm text-foreground/85">
              See every service and plan — in USD or naira — on the pricing page.
            </p>
            <Link
              href="/pricing"
              className="pill mt-5 inline-flex items-center gap-2 bg-white px-5 py-2.5 text-sm font-bold text-brand-700 transition-transform hover:scale-105"
            >
              View pricing
              <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </section>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />
    </div>
  );
}
