/**
 * SERVER-ONLY live NGN-per-USD rate with a three-layer safety net:
 * live fetch (cached 1h by Next) → plausibility band → env fallback.
 * Never throws, so the pricing page always renders.
 */
export async function getNgnPerUsd(): Promise<number> {
  const fallback = Number(process.env.FX_FALLBACK_NGN_PER_USD || 1500);
  const apiUrl =
    process.env.FX_API_URL ||
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";

  try {
    const res = await fetch(apiUrl, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`FX HTTP ${res.status}`);
    const json = (await res.json()) as { usd?: { ngn?: number | string } };
    const rate = Number(json?.usd?.ngn);
    if (!Number.isFinite(rate) || rate < 500 || rate > 5000) {
      throw new Error(`FX rate implausible: ${rate}`);
    }
    return rate;
  } catch (error) {
    console.log(
      `[fx] using fallback rate ${fallback} (${error instanceof Error ? error.message : "unknown error"})`,
    );
    return fallback;
  }
}
