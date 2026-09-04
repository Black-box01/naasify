"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";

type Status = "paid" | "pending" | "not_found";

/**
 * Client re-check for the callback page. The page confirms server-side on load,
 * but when the charge is still settling (or the webhook hasn't landed yet in
 * local dev) this button re-runs confirmAndActivate via /api/checkout/verify.
 */
export function ReCheckButton({
  reference,
  initialStatus,
}: {
  reference: string;
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
        body: JSON.stringify({ reference }),
      });
      const data = (await res.json()) as { status?: Status };
      if (data.status) setStatus(data.status);
    } catch {
      // Keep the pending state; the visitor can try again.
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button size="lg" loading={loading} onClick={() => void recheck()}>
        {loading ? "Checking…" : "I've paid — check again"}
      </Button>
      <p className="max-w-sm text-center text-xs text-foreground/50">
        Payments can take a few seconds to confirm. If it still shows pending,
        keep this page open or check your email for the receipt.
      </p>
    </div>
  );
}
