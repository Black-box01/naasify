import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BillingCycle, Plan, Service } from "@/lib/types";

/** Active services, ordered for display. RLS enforces is_active for anon. */
export async function getActiveServices(): Promise<Service[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("naasify_services")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []) as Service[];
}

/** Active per-service plans for a billing cycle. */
export async function getActivePlans(cycle: BillingCycle): Promise<Plan[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("naasify_plans")
    .select("*")
    .eq("is_active", true)
    .eq("billing_cycle", cycle)
    .not("service_id", "is", null)
    .order("sort_order", { ascending: true });
  return (data ?? []) as Plan[];
}

/** Bundle tier cards (service_id NULL) for a billing cycle. */
export async function getBundlePlans(cycle: BillingCycle): Promise<Plan[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("naasify_plans")
    .select("*")
    .eq("is_active", true)
    .eq("billing_cycle", cycle)
    .is("service_id", null)
    .order("sort_order", { ascending: true });
  return (data ?? []) as Plan[];
}
