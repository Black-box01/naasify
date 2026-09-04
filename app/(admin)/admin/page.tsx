import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/admin";
import { getNgnPerUsd } from "@/lib/fx";
import { formatMoney } from "@/lib/money";
import { Icon, type IconName } from "@/components/ui/icons";
import type { CurrencyCode } from "@/lib/types";

export const dynamic = "force-dynamic";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * ISO timestamp 30 days ago. Extracted to module scope so the impure
 * Date.now() call does not happen inside the render body (react-hooks/purity).
 */
function thirtyDaysAgoIso(): string {
  return new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
}

function StatCard({
  label,
  value,
  sub,
  icon,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: IconName;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="glass shadow-layered group rounded-3xl p-6 transition-all hover:-translate-y-1"
    >
      <div className="flex items-center justify-between">
        <span className="pill inline-flex bg-gradient-to-br from-brand-500/25 to-accent-500/25 p-2.5 text-accent-300">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <Icon
          name="arrow-right"
          className="h-4 w-4 text-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/70"
        />
      </div>
      <p className="font-display mt-4 text-3xl font-extrabold text-foreground">{value}</p>
      <p className="mt-1 text-sm font-medium text-foreground/60">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-foreground/40">{sub}</p>}
    </Link>
  );
}

export default async function AdminOverviewPage() {
  const supabase = createServiceClient();
  const since = thirtyDaysAgoIso();

  const [services, activeServices, plans, activePlans, newMessages, paidOrders, rate] =
    await Promise.all([
      supabase.from("naasify_services").select("*", { count: "exact", head: true }),
      supabase
        .from("naasify_services")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase.from("naasify_plans").select("*", { count: "exact", head: true }),
      supabase
        .from("naasify_plans")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("naasify_contact_messages")
        .select("*", { count: "exact", head: true })
        .eq("status", "new"),
      supabase
        .from("naasify_orders")
        .select("amount, currency")
        .eq("status", "paid")
        .gte("created_at", since),
      getNgnPerUsd(),
    ]);

  // Revenue (30d) normalised to NGN for a single headline number.
  const revenueNgn = (paidOrders.data ?? []).reduce((sum, row) => {
    const amount = Number(row.amount as string);
    const currency = row.currency as CurrencyCode;
    return sum + (currency === "USD" ? amount * rate : amount);
  }, 0);
  const paidCount = paidOrders.data?.length ?? 0;

  return (
    <div>
      <header>
        <h1 className="font-display text-3xl font-bold text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-foreground/50">
          A snapshot of your marketplace. Everything updates live.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Services"
          value={String(services.count ?? 0)}
          sub={`${activeServices.count ?? 0} active`}
          icon="layers"
          href="/admin/services"
        />
        <StatCard
          label="Plans"
          value={String(plans.count ?? 0)}
          sub={`${activePlans.count ?? 0} active`}
          icon="tag"
          href="/admin/plans"
        />
        <StatCard
          label="Paid orders (30d)"
          value={String(paidCount)}
          icon="credit-card"
          href="/admin/orders"
        />
        <StatCard
          label="Revenue (30d)"
          value={formatMoney(revenueNgn, "NGN")}
          sub={`≈ ${formatMoney(revenueNgn / rate, "USD")} at ₦${rate.toFixed(0)}/$`}
          icon="zap"
          href="/admin/orders"
        />
        <StatCard
          label="New messages"
          value={String(newMessages.count ?? 0)}
          sub="Awaiting a reply"
          icon="inbox"
          href="/admin/messages"
        />
      </div>
    </div>
  );
}
