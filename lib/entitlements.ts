import { createServiceClient } from "@/lib/supabase/admin";
import type { Plan, PlanEntitlements, Subscription } from "@/lib/types";

/**
 * Plan-based entitlement engine.
 *
 * A user's rights are the union of every ACTIVE subscription's plan
 * entitlements, merged "most generous wins". This module is the single source of
 * truth used by BOTH the dashboard (to hide/disable ineligible actions) and the
 * server routes (to reject unauthorized ones), so the UI and the API can never
 * disagree. All reads use the service-role client (server-only) because they
 * aggregate across tables and must not depend on the caller's RLS view.
 */

export const DEFAULT_ENTITLEMENTS: PlanEntitlements = {
  storage_mb: 0,
  max_file_mb: 0,
  allowed_file_types: [],
  max_builds: 0,
  addons: {},
};

const MB = 1024 * 1024;

/** Coerce a partial/legacy jsonb value into a complete, predictable object. */
export function normalizeEntitlements(raw: unknown): PlanEntitlements {
  const e = (raw && typeof raw === "object" ? raw : {}) as Partial<PlanEntitlements>;
  const num = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;

  const allowed_file_types = Array.isArray(e.allowed_file_types)
    ? e.allowed_file_types
        .map((t) => String(t).toLowerCase().replace(/^\./, "").trim())
        .filter(Boolean)
    : [];

  const addons: Record<string, number> = {};
  if (e.addons && typeof e.addons === "object") {
    for (const [slug, quota] of Object.entries(e.addons as Record<string, unknown>)) {
      const n = num(quota);
      if (n > 0) addons[slug] = n;
    }
  }

  return {
    storage_mb: num(e.storage_mb),
    max_file_mb: num(e.max_file_mb),
    allowed_file_types,
    max_builds: num(e.max_builds),
    addons,
  };
}

export interface EntitlementUsage {
  /** Sum of every build's file_size (bytes) for the user. */
  storage_used_bytes: number;
  /** Number of build records the user has. */
  builds_count: number;
  /** Active (pending|approved) request count per add-on service slug. */
  active_requests: Record<string, number>;
}

export interface ResolvedEntitlements extends PlanEntitlements {
  hasActivePlan: boolean;
  planNames: string[];
  usage: EntitlementUsage;
}

/** True when the type list grants every extension. */
function allowsAnyType(types: string[]): boolean {
  return types.includes("*");
}

/**
 * Resolve a user's aggregate entitlements from their active subscriptions plus
 * current usage (builds stored + active add-on requests).
 */
export async function getEntitlements(userId: string): Promise<ResolvedEntitlements> {
  const supabase = createServiceClient();

  const { data: subs } = await supabase
    .from("naasify_subscriptions")
    .select("*, plan:naasify_plans(*)")
    .eq("user_id", userId)
    .eq("status", "active");

  const activeSubs = (subs ?? []) as (Subscription & { plan: Plan | null })[];
  const planNames = activeSubs
    .map((s) => s.plan?.name)
    .filter((n): n is string => Boolean(n));

  // Merge most-generous-wins across every active plan.
  const merged: PlanEntitlements = { ...DEFAULT_ENTITLEMENTS, addons: {} };
  const typeSet = new Set<string>();
  let anyType = false;
  for (const sub of activeSubs) {
    const e = normalizeEntitlements(sub.plan?.entitlements);
    merged.storage_mb = Math.max(merged.storage_mb, e.storage_mb);
    merged.max_file_mb = Math.max(merged.max_file_mb, e.max_file_mb);
    merged.max_builds = Math.max(merged.max_builds, e.max_builds);
    if (allowsAnyType(e.allowed_file_types)) anyType = true;
    for (const t of e.allowed_file_types) typeSet.add(t);
    for (const [slug, quota] of Object.entries(e.addons)) {
      merged.addons[slug] = Math.max(merged.addons[slug] ?? 0, quota);
    }
  }
  merged.allowed_file_types = anyType ? ["*"] : [...typeSet];

  // Usage: aggregate stored bytes + build count.
  const { data: builds } = await supabase
    .from("naasify_user_builds")
    .select("file_size")
    .eq("user_id", userId);
  let storage_used_bytes = 0;
  let builds_count = 0;
  for (const b of (builds ?? []) as { file_size: string | number }[]) {
    storage_used_bytes += Number(b.file_size) || 0;
    builds_count += 1;
  }

  // Usage: active add-on requests per service slug (counts against quota).
  const { data: requests } = await supabase
    .from("naasify_service_requests")
    .select("service_slug")
    .eq("user_id", userId)
    .in("status", ["pending", "approved"]);
  const active_requests: Record<string, number> = {};
  for (const r of (requests ?? []) as { service_slug: string }[]) {
    active_requests[r.service_slug] = (active_requests[r.service_slug] ?? 0) + 1;
  }

  return {
    ...merged,
    hasActivePlan: activeSubs.length > 0,
    planNames,
    usage: { storage_used_bytes, builds_count, active_requests },
  };
}

export type GuardResult = { ok: true } | { ok: false; reason: string };

function extensionOf(fileName: string): string {
  const clean = fileName.toLowerCase();
  const dot = clean.lastIndexOf(".");
  return dot >= 0 ? clean.slice(dot + 1) : "";
}

/**
 * Authoritative upload gate. Mirrored client-side (UploadBuild) for instant
 * feedback, but the server always re-checks before issuing a signed URL.
 */
export function checkUpload(
  ent: ResolvedEntitlements,
  file: { fileName: string; fileSize: number },
): GuardResult {
  if (ent.storage_mb <= 0 || ent.max_builds <= 0) {
    return {
      ok: false,
      reason: "Your plan doesn't include project uploads. Upgrade to enable them.",
    };
  }
  const ext = extensionOf(file.fileName);
  if (!allowsAnyType(ent.allowed_file_types) && !ent.allowed_file_types.includes(ext)) {
    const allowed = ent.allowed_file_types.join(", ") || "none";
    return {
      ok: false,
      reason: `.${ext || "?"} files aren't allowed on your plan (allowed: ${allowed}).`,
    };
  }
  const maxFileBytes = ent.max_file_mb * MB;
  if (maxFileBytes > 0 && file.fileSize > maxFileBytes) {
    return {
      ok: false,
      reason: `That file is over your ${ent.max_file_mb} MB per-file limit.`,
    };
  }
  if (ent.usage.builds_count >= ent.max_builds) {
    return {
      ok: false,
      reason: `You've reached your ${ent.max_builds}-build limit on this plan.`,
    };
  }
  const quotaBytes = ent.storage_mb * MB;
  if (ent.usage.storage_used_bytes + file.fileSize > quotaBytes) {
    return {
      ok: false,
      reason: `That upload would exceed your ${Math.round(ent.storage_mb / 1024)} GB storage quota.`,
    };
  }
  return { ok: true };
}

/** Authoritative add-on request gate (eligibility + remaining quota). */
export function checkRequest(
  ent: ResolvedEntitlements,
  slug: string,
  serviceName: string,
): GuardResult {
  const quota = ent.addons[slug] ?? 0;
  if (quota <= 0) {
    return {
      ok: false,
      reason: `Your plan doesn't include ${serviceName}. Upgrade to request it.`,
    };
  }
  const used = ent.usage.active_requests[slug] ?? 0;
  if (used >= quota) {
    return {
      ok: false,
      reason: `You've reached your ${serviceName} request limit (${quota}) on this plan.`,
    };
  }
  return { ok: true };
}

/** Remaining request slots for an add-on (0 = locked or at capacity). */
export function remainingQuota(ent: ResolvedEntitlements, slug: string): number {
  const quota = ent.addons[slug] ?? 0;
  const used = ent.usage.active_requests[slug] ?? 0;
  return Math.max(0, quota - used);
}
