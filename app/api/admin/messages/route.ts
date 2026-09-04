import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** List contact messages (newest first) for the admin inbox. */
export async function GET() {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("naasify_contact_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ messages: data ?? [] });
}
