import type { CurrencyCode } from "@/lib/types";

/**
 * Pure currency conversion. `ngnPerUsd` is the live (or fallback) rate from
 * lib/fx.ts. Stored prices are never mutated — conversion happens at render.
 */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  ngnPerUsd: number,
): number {
  if (from === to) return amount;
  const usd = from === "USD" ? amount : amount / ngnPerUsd;
  return to === "USD" ? usd : usd * ngnPerUsd;
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "NGN" ? 0 : 2,
    minimumFractionDigits: currency === "NGN" ? 0 : 2,
  }).format(amount);
}
