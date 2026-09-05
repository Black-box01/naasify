import type { Metadata } from "next";
import Link from "next/link";
import { confirmAndActivate } from "@/lib/orders";
import { ReCheckButton } from "@/components/checkout/ReCheckButton";
import { AnimatedGradient } from "@/components/effects/AnimatedGradient";
import { Icon } from "@/components/ui/icons";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Checkout",
  description:
    "Confirming your NAASIFY payment and activating your subscription.",
  path: "/checkout/callback",
  noIndex: true,
});

type Status = "paid" | "pending" | "failed" | "not_found";

/**
 * The gateway redirects the buyer here after payment — Paystack with
 * ?reference=…, Flutterwave with ?tx_ref=&transaction_id=&status=…. We confirm
 * server-side immediately (idempotent) so activation never depends on the
 * webhook arriving first; both funnel through confirmAndActivate.
 */
export default async function CheckoutCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    reference?: string;
    tx_ref?: string;
    transaction_id?: string;
    status?: string;
  }>;
}) {
  const {
    reference,
    tx_ref,
    transaction_id,
    status: redirectStatus,
  } = await searchParams;
  // Paystack sends ?reference=; Flutterwave sends ?tx_ref=&transaction_id=.
  const merchantRef = reference ?? tx_ref;

  let status: Status = "not_found";
  if (merchantRef) {
    const result = await confirmAndActivate(merchantRef, undefined, {
      providerTransactionId: transaction_id,
    });
    // The gateway's own redirect status lets us show a definitive "failed"
    // instead of an endless "pending" when the buyer cancelled or was declined.
    if (
      result.status !== "paid" &&
      (redirectStatus === "failed" || redirectStatus === "cancelled")
    ) {
      status = "failed";
    } else {
      status = result.status;
    }
  }

  return (
    <div className="relative">
      <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6">
        <AnimatedGradient orbs />
        <div className="relative mx-auto max-w-xl">
          <div className="glass shadow-layered-lg rounded-3xl p-8 text-center sm:p-12">
            <StatusIcon status={status} />

            <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-foreground">
              {status === "paid"
                ? "Payment confirmed"
                : status === "pending"
                  ? "Confirming your payment"
                  : status === "failed"
                    ? "Payment not confirmed"
                    : "We couldn't find that payment"}
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm text-foreground/60">
              {status === "paid"
                ? "Your plan is active and a receipt is on its way to your inbox. You can manage everything from your dashboard."
                : status === "pending"
                  ? "We're waiting on your payment provider to finalise this charge. This usually takes a few seconds."
                  : status === "failed"
                    ? "We couldn't confirm this payment. If your card was charged it can take a few minutes to reflect — try the re-check below, or start a new checkout."
                    : "This checkout link is missing a valid reference. Start a new checkout from the pricing page."}
            </p>

            {merchantRef && (
              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground/5 px-4 py-1.5 font-mono text-xs text-foreground/45">
                <Icon name="credit-card" className="h-3.5 w-3.5" />
                {merchantRef}
              </p>
            )}

            <div className="mt-8">
              {status === "not_found" ? (
                <Link href="/pricing">
                  <span className="pill inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-3 text-sm font-semibold text-white shadow-layered transition-all hover:brightness-110">
                    Back to pricing
                    <Icon name="arrow-right" className="h-4 w-4" />
                  </span>
                </Link>
              ) : (
                <ReCheckButton
                  reference={merchantRef ?? ""}
                  transactionId={transaction_id}
                  initialStatus={status}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "paid") {
    return (
      <span className="pill mx-auto inline-flex bg-emerald-500/15 p-4 text-emerald-300 ring-1 ring-emerald-400/30">
        <Icon name="check" className="h-8 w-8" />
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="pill mx-auto inline-flex bg-accent-500/15 p-4 text-accent-300 ring-1 ring-accent-400/30">
        <Icon name="clock" className="h-8 w-8 animate-pulse" />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="pill mx-auto inline-flex bg-red-500/15 p-4 text-red-300 ring-1 ring-red-400/30">
        <Icon name="x" className="h-8 w-8" />
      </span>
    );
  }
  return (
    <span className="pill mx-auto inline-flex bg-foreground/5 p-4 text-foreground/50 ring-1 ring-foreground/10">
      <Icon name="x" className="h-8 w-8" />
    </span>
  );
}
