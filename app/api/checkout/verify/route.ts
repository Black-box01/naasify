import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { confirmAndActivate } from "@/lib/orders";

export const dynamic = "force-dynamic";

const verifySchema = z.object({
  reference: z.string().min(4).max(200),
});

/**
 * Safety net for local/dev (or any moment the webhook is unreachable): the
 * callback page's ReCheckButton POSTs here to re-run confirmAndActivate, which
 * verifies the charge straight with Paystack and is fully idempotent.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Missing reference." },
      { status: 400 },
    );
  }

  try {
    const result = await confirmAndActivate(parsed.data.reference);
    return NextResponse.json({ status: result.status });
  } catch (error) {
    console.error(
      "[checkout/verify] failed:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ status: "pending" }, { status: 200 });
  }
}
