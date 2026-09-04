"use client";

import { SegmentedPills } from "@/components/ui/SegmentedPills";
import type { CurrencyCode } from "@/lib/types";

/**
 * Display-currency segmented control. Purely client-side: the live rate is
 * passed down from the server, so switching currencies makes zero network
 * calls and never re-fetches plans.
 */
export function CurrencyToggle({
  currency,
  onChange,
}: {
  currency: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
}) {
  return (
    <SegmentedPills<CurrencyCode>
      ariaLabel="Display currency"
      value={currency}
      options={[
        { value: "USD", label: "USD $" },
        { value: "NGN", label: "NGN ₦" },
      ]}
      onChange={onChange}
    />
  );
}
