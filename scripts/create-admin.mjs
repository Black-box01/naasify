#!/usr/bin/env node
/**
 * Provision (or reset) a NAASIFY admin user and promote it to role='admin'.
 *
 * - Creates the Supabase Auth user with `email_confirm: true`, so NO
 *   verification email is sent and the account can sign in immediately.
 * - If a user with that email already exists, its password is reset and the
 *   address is re-confirmed instead of failing.
 * - Promotes the matching `naasify_profiles` row to role='admin' (the profile
 *   is bootstrapped automatically by the `handle_new_auth_user` trigger; we
 *   upsert as a fallback).
 *
 * Uses the SERVICE ROLE key — run locally only, never expose it to the client.
 *
 * Usage (from the project root):
 *   node scripts/create-admin.mjs <email> <password> [fullName]
 *   # or via env:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/create-admin.mjs
 *
 * The password is intentionally NOT hardcoded here (kept out of source
 * control). Email defaults to info@naasify.online when not supplied.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL") || get("SUPABASE_URL");
const SERVICE_KEY = get("SUPABASE_SERVICE_ROLE_KEY");

const EMAIL = (process.argv[2] || get("ADMIN_EMAIL") || "info@naasify.online").trim();
const PASSWORD = process.argv[3] || get("ADMIN_PASSWORD") || "";
const FULL_NAME = process.argv[4] || get("ADMIN_NAME") || "NAASIFY Admin";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (check .env.local). Aborting.",
  );
  process.exit(1);
}
if (!PASSWORD) {
  console.error(
    "✖ A password is required. Usage: node scripts/create-admin.mjs <email> <password> [fullName]",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const mask = (s) =>
  s.length <= 4 ? "****" : `${s.slice(0, 2)}${"*".repeat(Math.max(4, s.length - 4))}${s.slice(-2)}`;

async function findUserByEmail(email) {
  const target = email.toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 50 });
    if (error) throw error;
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email || "").toLowerCase() === target);
    if (hit) return hit;
    if (users.length < 50) return null;
    page += 1;
  }
}

console.log("\nNAASIFY admin provisioning");
console.log(`  project: ${SUPABASE_URL}`);
console.log(`  email:   ${EMAIL}`);
console.log(`  pass:    ${mask(PASSWORD)}\n`);

let userId;
try {
  const existing = await findUserByEmail(EMAIL);
  if (existing) {
    userId = existing.id;
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata || {}),
        full_name: existing.user_metadata?.full_name || FULL_NAME,
      },
    });
    if (error) throw error;
    console.log("  ✔ existing user found — password reset & email confirmed");
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log("  ✔ user created (auto-confirmed — no verification email)");
  }
} catch (err) {
  console.error(`  ✖ auth error: ${err.message || err}`);
  process.exit(1);
}

try {
  const { data: updated, error: updErr } = await supabase
    .from("naasify_profiles")
    .update({ role: "admin", email: EMAIL })
    .eq("id", userId)
    .select("id, role");
  if (updErr) throw updErr;
  if (!updated || updated.length === 0) {
    const { error: insErr } = await supabase
      .from("naasify_profiles")
      .insert({ id: userId, email: EMAIL, full_name: FULL_NAME, role: "admin" });
    if (insErr) throw insErr;
    console.log("  ✔ profile inserted with role=admin");
  } else {
    console.log("  ✔ profile promoted to role=admin");
  }
} catch (err) {
  console.error(`  ✖ profile error: ${err.message || err}`);
  process.exit(1);
}

const { data: profile } = await supabase
  .from("naasify_profiles")
  .select("email, role")
  .eq("id", userId)
  .maybeSingle();

console.log("\nResult:");
console.log(`  user id: ${userId}`);
console.log(`  profile: ${profile ? `${profile.email} → ${profile.role}` : "(not found)"}`);
const ok = profile?.role === "admin";
console.log(`\n${ok ? "✔ ADMIN READY — sign in at /login" : "✖ FAILED to promote to admin"}\n`);
process.exit(ok ? 0 : 1);
