import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serviceSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** List all services (active and inactive) for the admin table. */
export async function GET() {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("naasify_services")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ services: data ?? [] });
}

/** Create a service. Slug is derived from the name when omitted. */
export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid service" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("naasify_services")
    .insert({
      name: input.name,
      slug: input.slug?.trim() || slugify(input.name),
      description: input.description ?? null,
      icon_key: input.icon_key ?? "box",
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ service: data }, { status: 201 });
}
