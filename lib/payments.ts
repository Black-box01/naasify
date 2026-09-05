import { initializeTransaction, verifyTransaction } from "@/lib/paystack";
import {
  findTransactionByRef,
  initializePayment,
  verifyTransactionById,
} from "@/lib/flutterwave";
import type { GatewayName } from "@/lib/types";

/**
 * Gateway-agnostic payment layer. Wraps the low-level Paystack and Flutterwave
 * clients behind one interface so lib/orders.ts never branches on the processor.
 *
 * Selection is env-based (no DB lookup): Flutterwave is preferred whenever
 * FLW_SECRET_KEY is set, so it becomes the default the moment it is configured —
 * and when BOTH gateways are present it wins. Override explicitly with
 * PAYMENT_GATEWAY=flutterwave|paystack.
 */

export function isPaystackConfigured(): boolean {
  return !!process.env.PAYSTACK_SECRET_KEY;
}

export function isFlutterwaveConfigured(): boolean {
  return !!process.env.FLW_SECRET_KEY;
}

export function configuredGateways(): GatewayName[] {
  const list: GatewayName[] = [];
  if (isFlutterwaveConfigured()) list.push("flutterwave");
  if (isPaystackConfigured()) list.push("paystack");
  return list;
}

/** The gateway used for NEW charges. Throws when none is configured. */
export function activeGatewayName(): GatewayName {
  const pref = (process.env.PAYMENT_GATEWAY || "").toLowerCase();
  if (pref === "flutterwave" && isFlutterwaveConfigured()) return "flutterwave";
  if (pref === "paystack" && isPaystackConfigured()) return "paystack";
  if (isFlutterwaveConfigured()) return "flutterwave";
  if (isPaystackConfigured()) return "paystack";
  throw new Error(
    "No payment gateway configured: set FLW_SECRET_KEY or PAYSTACK_SECRET_KEY",
  );
}

/** Start a hosted charge; returns the URL to redirect the buyer to. */
export async function initializeCharge({
  gateway,
  email,
  customerName,
  amountMajor,
  amountMinor,
  currency,
  reference,
  callbackBaseUrl,
  metadata,
}: {
  gateway: GatewayName;
  email: string;
  customerName?: string;
  /** Major units (naira for NGN) — what Flutterwave expects. */
  amountMajor: number;
  /** Minor units (kobo) — what Paystack expects. */
  amountMinor: number;
  currency: string;
  reference: string;
  callbackBaseUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<{ authorizationUrl: string }> {
  if (gateway === "flutterwave") {
    const { link } = await initializePayment({
      email,
      customerName,
      amount: amountMajor,
      currency,
      reference,
      // Flutterwave appends ?status=&tx_ref=&transaction_id= to this URL.
      redirectUrl: callbackBaseUrl,
      meta: metadata,
    });
    return { authorizationUrl: link };
  }
  const init = await initializeTransaction({
    email,
    amountKobo: amountMinor,
    reference,
    callbackUrl: `${callbackBaseUrl}?reference=${encodeURIComponent(reference)}`,
    metadata,
  });
  return { authorizationUrl: init.authorization_url };
}

export type VerifyStatus = "success" | "failed" | "pending";

export interface VerifyResult {
  status: VerifyStatus;
  /** Major units (naira for NGN) so it compares directly to orders.amount. */
  amountMajor: number;
  currency: string;
  reference: string;
  providerTransactionId?: string;
}

/**
 * Verify a charge straight from the processor. Paystack verifies by merchant
 * reference; Flutterwave verifies by its numeric transaction id, falling back to
 * a tx_ref lookup when only the reference is known (e.g. the callback re-check).
 */
export async function verifyCharge({
  gateway,
  reference,
  providerTransactionId,
}: {
  gateway: GatewayName;
  reference: string;
  providerTransactionId?: string;
}): Promise<VerifyResult> {
  if (gateway === "flutterwave") {
    const txn = providerTransactionId
      ? await verifyTransactionById(providerTransactionId)
      : await findTransactionByRef(reference);
    if (!txn) {
      return { status: "pending", amountMajor: 0, currency: "", reference };
    }
    return {
      status: mapFlutterwaveStatus(txn.status),
      amountMajor: Number(txn.amount),
      currency: txn.currency,
      reference: txn.tx_ref,
      providerTransactionId: String(txn.id),
    };
  }
  const txn = await verifyTransaction(reference);
  return {
    status: mapPaystackStatus(txn.status),
    amountMajor: txn.amount / 100,
    currency: txn.currency,
    reference: txn.reference,
  };
}

function mapPaystackStatus(status: string): VerifyStatus {
  if (status === "success") return "success";
  if (status === "failed") return "failed";
  return "pending";
}

function mapFlutterwaveStatus(status: string): VerifyStatus {
  const normalized = (status || "").toLowerCase();
  if (normalized === "successful" || normalized === "success") return "success";
  if (normalized === "failed" || normalized === "cancelled") return "failed";
  return "pending";
}
