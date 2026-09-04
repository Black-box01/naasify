#!/usr/bin/env node
/**
 * Local webhook proof for NAASIFY.
 *
 * Signs a sample `charge.success` event with PAYSTACK_SECRET_KEY and POSTs it
 * TWICE to the running dev server, then reports the HTTP statuses and the
 * resulting row counts. Expected outcome:
 *   - POST #1 → 200 (event recorded + processed)
 *   - POST #2 → 200 { duplicate: true } (idempotency gate; no second row)
 *   - exactly ONE naasify_paystack_events row for the event id
 *
 * Usage (from the project root, dev server running):
 *   node scripts/verify-webhook.mjs
 *   node scripts/verify-webhook.mjs --url http://localhost:3000
 *
 * Reads .env.local automatically; PAYSTACK_SECRET_KEY is required. Because the
 * sample reference is not a real Paystack charge, confirmAndActivate's verify
 * step returns "pending" — that is expected here. This script proves the
 * SIGNATURE CHECK and the DUPLICATE GATE, not real-money activation.
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  } catch {
    // No .env.local — fall back to the ambient environment.
  }
  return env;
}

const fileEnv = loadEnv();
const get = (k) => process.env[k] || fileEnv[k] || "";

const SECRET = get("PAYSTACK_SECRET_KEY");
const APP_URL = get("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";
const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL") || get("SUPABASE_URL");
const SERVICE_KEY = get("SUPABASE_SERVICE_ROLE_KEY");

// Allow --url override.
const urlArgIdx = process.argv.indexOf("--url");
const baseUrl = urlArgIdx !== -1 && process.argv[urlArgIdx + 1]
  ? process.argv[urlArgIdx + 1].replace(/\/$/, "")
  : APP_URL.replace(/\/$/, "");
const webhookUrl = `${baseUrl}/api/webhooks/paystack`;

if (!SECRET) {
  console.error("✖ PAYSTACK_SECRET_KEY is not set (check .env.local). Aborting.");
  process.exit(1);
}

const uniqueId = Date.now();
const eventId = `charge.success:${uniqueId}`;
const reference = `naas_verify_${uniqueId}`;

const payload = {
  event: "charge.success",
  id: uniqueId,
  data: {
    id: uniqueId,
    domain: "test",
    status: "success",
    reference,
    amount: 35000000, // ₦350,000.00 in kobo
    currency: "NGN",
    gateway_response: "Successful",
    paid_at: new Date().toISOString(),
    channel: "card",
    customer: { email: "verify@example.com" },
  },
};

const rawBody = JSON.stringify(payload);
const signature = createHmac("sha512", SECRET).update(rawBody).digest("hex");

async function post(label, body, sig) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-paystack-signature": sig,
    },
    body,
  });
  const text = await res.text();
  console.log(`${label} → HTTP ${res.status} ${text}`);
  return res.status;
}

async function countRows(table, filter) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=*&${filter}`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows.length : null;
  } catch {
    return null;
  }
}

console.log(`\nNAASIFY webhook verification`);
console.log(`  target:    ${webhookUrl}`);
console.log(`  event id:  ${eventId}`);
console.log(`  reference: ${reference}\n`);

// 0) Negative control: a bad signature must be rejected with 401.
const bad = await post("POST #0 (bad signature)", rawBody, "deadbeef");

// 1) First valid delivery.
const first = await post("POST #1 (valid)", rawBody, signature);

// 2) Duplicate delivery — must be gated, not double-processed.
const second = await post("POST #2 (duplicate)", rawBody, signature);

const eventRows = await countRows(
  "naasify_paystack_events",
  `event_id=eq.${encodeURIComponent(eventId)}`,
);
const orderRows = await countRows(
  "naasify_orders",
  `paystack_reference=eq.${encodeURIComponent(reference)}`,
);

console.log("\nResult:");
console.log(`  bad signature rejected (401): ${bad === 401 ? "✔" : "✖ got " + bad}`);
console.log(`  first delivery 200:           ${first === 200 ? "✔" : "✖ got " + first}`);
console.log(`  duplicate delivery 200:       ${second === 200 ? "✔" : "✖ got " + second}`);
if (eventRows !== null) {
  console.log(
    `  naasify_paystack_events rows (want 1): ${eventRows === 1 ? "✔" : "✖"} ${eventRows}`,
  );
} else {
  console.log("  naasify_paystack_events rows: (skipped — Supabase env not set)");
}
if (orderRows !== null) {
  console.log(
    `  naasify_orders rows for reference (want 0): ${orderRows === 0 ? "✔" : "✖"} ${orderRows}`,
  );
}

const ok = bad === 401 && first === 200 && second === 200 && (eventRows === null || eventRows === 1);
console.log(`\n${ok ? "✔ PASS" : "✖ FAIL"}\n`);
process.exit(ok ? 0 : 1);
