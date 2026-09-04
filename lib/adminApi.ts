/**
 * Client-side helper for the /api/admin/* routes. Sends JSON, never caches,
 * and turns a non-2xx response into a thrown Error carrying the server's
 * message so forms/tables can surface it directly.
 */
export async function adminFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
