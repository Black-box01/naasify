import { timingSafeEqual } from "node:crypto";

/**
 * Minimal Flutterwave client — raw fetch + node:crypto (no SDK), mirroring
 * lib/paystack.ts. Amounts are in MAJOR units (naira for NGN), unlike Paystack's
 * kobo. Server-only: requires FLW_SECRET_KEY; webhook verification additionally
 * requires FLW_SECRET_HASH.
 */
const SECRET = process.env.FLW_SECRET_KEY || "";
const SECRET_HASH = process.env.FLW_SECRET_HASH || "";
const BASE_URL = "https://api.flutterwave.com/v3";

export interface FlutterwaveInitResponse {
  link: string;
}

export interface FlutterwaveTransaction {
  id: number;
  tx_ref: string;
  status: string; // "successful" | "failed" | "pending" | …
  amount: number; // major units (naira for NGN)
  currency: string;
  charged_amount?: number;
  customer?: { email?: string; name?: string };
  created_at?: string;
}

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${SECRET}`,
    "Content-Type": "application/json",
  };
}

/** Start a charge; returns the hosted-checkout link (data.link). */
export async function initializePayment({
  email,
  customerName,
  amount,
  currency,
  reference,
  redirectUrl,
  meta,
}: {
  email: string;
  customerName?: string;
  amount: number;
  currency: string;
  reference: string;
  redirectUrl: string;
  meta?: Record<string, unknown>;
}): Promise<FlutterwaveInitResponse> {
  if (!SECRET) throw new Error("FLW_SECRET_KEY is not configured");

  const res = await fetch(`${BASE_URL}/payments`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      tx_ref: reference,
      amount,
      currency,
      redirect_url: redirectUrl,
      customer: {
        email,
        ...(customerName ? { name: customerName } : {}),
      },
      customizations: { title: "NAASIFY" },
      ...(meta ? { meta } : {}),
    }),
  });
  const json = (await res.json()) as {
    status?: string;
    message?: string;
    data?: FlutterwaveInitResponse;
  };
  if (!res.ok || json.status !== "success" || !json.data?.link) {
    throw new Error(json.message || "Flutterwave could not initialize the payment");
  }
  return json.data;
}

/** Verify a transaction by Flutterwave's numeric id (the source of truth). */
export async function verifyTransactionById(
  id: string | number,
): Promise<FlutterwaveTransaction> {
  if (!SECRET) throw new Error("FLW_SECRET_KEY is not configured");

  const res = await fetch(
    `${BASE_URL}/transactions/${encodeURIComponent(String(id))}/verify`,
    { headers: authHeaders() },
  );
  const json = (await res.json()) as {
    status?: string;
    message?: string;
    data?: FlutterwaveTransaction;
  };
  if (!res.ok || json.status !== "success" || !json.data) {
    throw new Error(json.message || "Flutterwave could not verify the transaction");
  }
  return json.data;
}

/**
 * Fallback lookup when only the merchant reference (tx_ref) is known — e.g. the
 * callback "I've paid — check again" re-check, which carries no transaction id.
 * Lists transactions filtered by tx_ref and returns the most recent match, or
 * null when none exists.
 */
export async function findTransactionByRef(
  txRef: string,
): Promise<FlutterwaveTransaction | null> {
  if (!SECRET) throw new Error("FLW_SECRET_KEY is not configured");

  const res = await fetch(
    `${BASE_URL}/transactions?tx_ref=${encodeURIComponent(txRef)}`,
    { headers: authHeaders() },
  );
  const json = (await res.json()) as {
    status?: string;
    message?: string;
    data?: FlutterwaveTransaction[];
  };
  if (!res.ok || json.status !== "success" || !Array.isArray(json.data)) {
    throw new Error(json.message || "Flutterwave could not list transactions");
  }
  const matches = json.data.filter((txn) => txn.tx_ref === txRef);
  if (matches.length === 0) return null;
  // Most recent first by created_at (stable fallback to the API's own order).
  matches.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  return matches[0];
}

/**
 * Validate a webhook's `verif-hash` header. Flutterwave echoes the secret hash
 * you configure in its dashboard (plain equality, NOT an HMAC). Uses a
 * length-guarded timingSafeEqual to avoid timing leaks.
 */
export function verifyWebhookHash(headerValue: string | null): boolean {
  if (!SECRET_HASH || !headerValue) return false;
  const a = Buffer.from(SECRET_HASH);
  const b = Buffer.from(headerValue);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
