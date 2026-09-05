/**
 * Pure redirect helpers shared by the middleware (`proxy.ts`) and client auth
 * (`AuthCard.tsx`). No server-only imports so both runtimes can use them.
 */

/**
 * Open-redirect guard: accept only same-origin relative paths. Rejects empty
 * values, protocol-relative URLs (`//host`), backslash tricks (`/\host`) and
 * anything carrying a scheme (`https:`), returning null so the caller can fall
 * back to a safe default.
 */
export function safeNextPath(next?: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  if (next.includes("\\")) return null;
  // A colon before the first slash implies an absolute/scheme URL (e.g. "http:").
  const firstSlash = next.indexOf("/", 1);
  const colon = next.indexOf(":");
  if (colon !== -1 && (firstSlash === -1 || colon < firstSlash)) return null;
  return next;
}

/**
 * Where to send a user straight after authentication. An explicit, safe `next`
 * always wins (so a purchase or admin deep-link continues); otherwise admins land
 * on the admin console and everyone else on the user dashboard.
 */
export function resolvePostAuthPath(
  role?: string | null,
  explicitNext?: string | null,
): string {
  const safe = safeNextPath(explicitNext);
  if (safe) return safe;
  return role === "admin" ? "/admin" : "/dashboard";
}
