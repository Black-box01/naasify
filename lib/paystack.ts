import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Minimal Paystack client — raw fetch + node:crypto (no SDK). All amounts are
 * in kobo (NGN). Server-only: requires PAYSTACK_SECRET_KEY.
 */
const SECRET = process.env.PAYSTACK_SECRET_KEY || "";
const BASE_URL = "https://api.paystack.co";

export interface PaystackInitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackTransaction {
  status: string; // "success" | "failed" | "abandoned" | …
  reference: string;
  amount: number; // kobo
  currency: string;
  paid_at?: string | null;
  metadata?: Record<string, unknown>;
  customer?: { email?: string; id?: number };
}

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${SECRET}`,
    "Content-Type": "application/json",
  };
}

/** Start a charge; returns the hosted-checkout authorization_url. */
export async function initializeTransaction({
  email,
  amountKobo,
  reference,
  callbackUrl,
  metadata,
}: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitResponse> {
  if (!SECRET) throw new Error("PAYSTACK_SECRET_KEY is not configured");

  const res = await fetch(`${BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      email,
      amount: amountKobo,
      reference,
      callback_url: callbackUrl,
      ...(metadata ? { metadata } : {}),
    }),
  });
  const json = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: PaystackInitResponse;
  };
  if (!res.ok || !json.status || !json.data?.authorization_url) {
    throw new Error(json.message || "Paystack could not initialize the transaction");
  }
  return json.data;
}

/** Verify a transaction by reference straight from Paystack (source of truth). */
export async function verifyTransaction(
  reference: string,
): Promise<PaystackTransaction> {
  if (!SECRET) throw new Error("PAYSTACK_SECRET_KEY is not configured");

  const res = await fetch(
    `${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: authHeaders() },
  );
  const json = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: PaystackTransaction;
  };
  if (!res.ok || !json.status || !json.data) {
    throw new Error(json.message || "Paystack could not verify the transaction");
  }
  return json.data;
}

/**
 * Validate a webhook's x-paystack-signature (HMAC-SHA512 hex of the RAW body).
 * Uses a length-guarded timingSafeEqual to avoid timing leaks and throws on
 * mismatched-length buffers.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!SECRET || !signatureHeader) return false;
  const expected = createHmac("sha512", SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Collision-resistant, human-traceable charge reference. */
export function makeReference(): string {
  return `naas_${Date.now()}_${randomBytes(6).toString("hex")}`;
}
