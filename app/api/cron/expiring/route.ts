import { NextResponse, type NextRequest } from "next/server";
import { runExpiryJob } from "@/lib/expiry";

export const dynamic = "force-dynamic";

/**
 * Daily Vercel Cron target (see vercel.json). Guarded by CRON_SECRET: Vercel
 * calls it with "Authorization: Bearer <CRON_SECRET>" on every scheduled run.
 * Without a configured secret the route refuses to run, so it can never be
 * triggered anonymously in production.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runExpiryJob();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Expiry job failed";
    console.error("[cron/expiring]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
