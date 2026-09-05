"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";

type Status = "paid" | "pending" | "failed" | "not_found";

/**
 * Client re-check for the callback page. The page confirms server-side on load,
 * but when the charge is still settling (or the webhook hasn't landed yet in
 * local dev) this button re-runs confirmAndActivate via /api/checkout/verify.
 * `transactionId` is Flutterwave's numeric id, forwarded so verification can hit
 * the exact transaction instead of a tx_ref lookup.
 */
export function ReCheckButton({
  reference,
  transactionId,
  initialStatus,
}: {
  reference: string;
  transactionId?: string;
  initialStatus: Status;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [loading, setLoading] = useState(false);

  if (status === "paid") {
    return (
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link href="/dashboard" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto" size="lg">
            Go to dashboard
            <Icon name="arrow-right" className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/pricing" className="w-full sm:w-auto">
          <Button variant="glass" size="lg" className="w-full sm:w-auto">
            Browse more services
          </Button>
        </Link>
      </div>
    );
  }

  async function recheck() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, transactionId }),
      });
      const data = (await res.json()) as { status?: Status };
      if (data.status) setStatus(data.status);
    } catch {
      // Keep the current state; the visitor can try again.
    } finally {
      setLoading(false);
    }
  }

  const failed = status === "failed";
  return (
    <div className="flex flex-col items-center gap-3">
      <Button size="lg" loading={loading} onClick={() => void recheck()}>
        {loading ? "Checking…" : failed ? "Try again" : "I've paid — check again"}
      </Button>
      <p className="max-w-sm text-center text-xs text-foreground/50">
        {failed
          ? "We couldn't confirm that payment. If you were charged it may take a few minutes to appear — re-check, or start a new checkout."
          : "Payments can take a few seconds to confirm. If it still shows pending, keep this page open or check your email for the receipt."}
      </p>
      {failed && (
        <Link href="/pricing">
          <Button variant="glass" size="lg" className="w-full sm:w-auto">
            Back to pricing
          </Button>
        </Link>
      )}
    </div>
  );
}
