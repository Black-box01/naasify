"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { SegmentedPills } from "@/components/ui/SegmentedPills";
import { BILLING_CYCLES, CYCLE_LABELS } from "@/lib/constants";
import type { BillingCycle } from "@/lib/types";

/**
 * Billing-cycle segmented control. Cycle drives which plans the server
 * fetches, so it lives in the URL (`?cycle=`) and triggers an RSC round-trip.
 */
export function CycleToggle({ cycle }: { cycle: BillingCycle }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className={isPending ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <SegmentedPills<BillingCycle>
        ariaLabel="Billing cycle"
        value={cycle}
        options={BILLING_CYCLES.map((c) => ({ value: c, label: CYCLE_LABELS[c] }))}
        onChange={(next) => {
          if (next === cycle) return;
          startTransition(() => {
            router.push(`/pricing?cycle=${next}`);
          });
        }}
      />
    </div>
  );
}
