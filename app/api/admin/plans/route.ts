import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { planSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const CYCLES = ["quarterly", "half_yearly", "annual"];

/**
 * List plans for the admin table. Optional filters:
 *   ?cycle=quarterly|half_yearly|annual
 *   ?service=<uuid> | bundle (service_id IS NULL)
 */
export async function GET(request: Request) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const cycle = url.searchParams.get("cycle");
  const service = url.searchParams.get("service");

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("naasify_plans")
    .select("*, service:naasify_services(id, name, slug)")
    .order("sort_order", { ascending: true });

  if (cycle && CYCLES.includes(cycle)) {
    query = query.eq("billing_cycle", cycle);
  }
  if (service === "bundle") {
    query = query.is("service_id", null);
  } else if (service) {
    query = query.eq("service_id", service);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ plans: data ?? [] });
}

/** Create a plan. service_id NULL makes it a bundle (All-in-One style) tier. */
export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid plan" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("naasify_plans")
    .insert({
      service_id: input.service_id,
      name: input.name,
      billing_cycle: input.billing_cycle,
      price: input.price,
      currency: input.currency,
      features: input.features,
      is_highlighted: input.is_highlighted,
      is_active: input.is_active,
      sort_order: input.sort_order,
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ plan: data }, { status: 201 });
}
