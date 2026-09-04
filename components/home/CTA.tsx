import Link from "next/link";
import { Icon } from "@/components/ui/icons";

/** Closing call-to-action band on an animated gradient background. */
export function CTA() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
      <div className="animated-gradient-bg shadow-layered-lg relative overflow-hidden rounded-[2.5rem] px-6 py-16 text-center sm:px-16">
        <div
          className="pointer-events-none absolute inset-0 bg-black/25"
          aria-hidden="true"
        />
        <div className="relative">
          <h2 className="font-display mx-auto max-w-2xl text-3xl font-extrabold text-white sm:text-4xl">
            Ready to run your whole backend on NAASIFY?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">
            Pick a bundle, check out with Paystack, and go live in minutes. No
            servers to babysit, no surprise invoices.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/pricing"
              className="pill inline-flex items-center gap-2 bg-white px-8 py-3.5 text-base font-bold text-brand-700 shadow-layered transition-transform hover:scale-105"
            >
              Get started
              <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="pill inline-flex items-center gap-2 border border-white/40 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              Contact sales
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
