import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/admin";
import { SignOutButton } from "@/components/SignOutButton";
import { BuyButton } from "@/components/pricing/BuyButton";
import { ExpiryBanner } from "@/components/dashboard/ExpiryBanner";
import { CheckoutErrorBanner } from "@/components/checkout/CheckoutErrorBanner";
import { UploadBuild } from "@/components/dashboard/UploadBuild";
import { BuildsList } from "@/components/dashboard/BuildsList";
import { SupportChat } from "@/components/dashboard/SupportChat";
import { EntitlementsSummary } from "@/components/dashboard/EntitlementsSummary";
import { AddOnServices, type AddOnCard } from "@/components/dashboard/AddOnServices";
import { ServiceRequestsList } from "@/components/dashboard/ServiceRequestsList";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/money";
import { CYCLE_LABELS } from "@/lib/constants";
import { daysUntil } from "@/lib/utils";
import { getEntitlements, remainingQuota } from "@/lib/entitlements";
import { ADD_ON_SLUGS } from "@/lib/service-requests";
import type {
  CurrencyCode,
  Order,
  OrderStatus,
  Service,
  ServiceRequestWithUser,
  Subscription,
  SubscriptionStatus,
  UserBuild,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

const ORDER_TONE: Record<OrderStatus, "success" | "warning" | "danger" | "neutral"> = {
  paid: "success",
  pending: "warning",
  failed: "danger",
  refunded: "neutral",
};

const SUB_TONE: Record<SubscriptionStatus, "success" | "neutral" | "danger"> = {
  active: "success",
  expired: "neutral",
  cancelled: "danger",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { dateStyle: "medium" });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { user, profile } = await requireUser();
  const supabase = createServiceClient();

  const [subsRes, ordersRes, buildsRes, servicesRes, requestsRes, entitlements] =
    await Promise.all([
      supabase
        .from("naasify_subscriptions")
        .select("*, plan:naasify_plans(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("naasify_orders")
        .select("*, plan:naasify_plans(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("naasify_user_builds")
        .select("*")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false }),
      supabase
        .from("naasify_services")
        .select("*")
        .eq("is_active", true)
        .in("slug", [...ADD_ON_SLUGS])
        .order("sort_order", { ascending: true }),
      supabase
        .from("naasify_service_requests")
        .select("*, service:naasify_services(id, name, slug, icon_key)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      getEntitlements(user.id),
    ]);

  const subscriptions = (subsRes.data ?? []) as Subscription[];
  const orders = (ordersRes.data ?? []) as Order[];
  const builds = (buildsRes.data ?? []) as UserBuild[];
  const services = (servicesRes.data ?? []) as Service[];
  const serviceRequests = (requestsRes.data ?? []) as ServiceRequestWithUser[];
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const displayName = profile?.full_name || user.email || "there";

  // Per-add-on eligibility for the dashboard cards (server-authoritative).
  const addOnCards: AddOnCard[] = services.map((service) => ({
    id: service.id,
    name: service.name,
    slug: service.slug,
    iconKey: service.icon_key,
    quota: entitlements.addons[service.slug] ?? 0,
    remaining: remainingQuota(entitlements, service.slug),
  }));

  // Soonest-expiring active plan drives the colour-coded countdown banner.
  const soonestExpiring = [...activeSubs].sort(
    (a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime(),
  )[0];

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4 pt-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Welcome back, <span className="text-gradient">{displayName}</span>
          </h1>
          <p className="mt-1 text-sm text-foreground/50">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/pricing"
            className="pill glass inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/10"
          >
            <Icon name="plus" className="h-4 w-4" />
            New subscription
          </Link>
          <SignOutButton />
        </div>
      </header>

      <CheckoutErrorBanner code={error} />

      {soonestExpiring && (
        <ExpiryBanner
          planName={soonestExpiring.plan?.name ?? "Subscription"}
          endsAt={soonestExpiring.ends_at}
          daysLeft={daysUntil(soonestExpiring.ends_at)}
        />
      )}

      {/* Active subscriptions */}
      <section className="mt-12">
        <h2 className="font-display text-lg font-bold text-foreground">
          Your subscriptions
        </h2>
        {activeSubs.length === 0 ? (
          <div className="glass mt-4 rounded-3xl p-10 text-center">
            <p className="text-foreground/60">You don&apos;t have an active subscription yet.</p>
            <Link
              href="/pricing"
              className="pill mt-5 inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-2.5 text-sm font-semibold text-white shadow-layered transition-all hover:brightness-110"
            >
              Browse plans
              <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
            {activeSubs.map((sub) => (
              <div
                key={sub.id}
                className="glass shadow-layered flex flex-col rounded-3xl p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">
                      {sub.plan?.name ?? "Subscription"}
                    </h3>
                    <p className="mt-0.5 text-xs text-foreground/45">
                      {sub.plan
                        ? CYCLE_LABELS[sub.plan.billing_cycle]
                        : "—"}{" "}
                      · Renews {formatDate(sub.ends_at)}
                    </p>
                  </div>
                  <Badge tone={SUB_TONE[sub.status]}>{sub.status}</Badge>
                </div>
                <div className="mt-6 flex items-center justify-between gap-3">
                  <span className="text-xs text-foreground/40">
                    {formatDate(sub.starts_at)} → {formatDate(sub.ends_at)}
                  </span>
                  <div className="w-36">
                    <BuyButton
                      planId={sub.plan_id}
                      planName={sub.plan?.name ?? "plan"}
                      authenticated
                      returnTo="/dashboard"
                      label="Renew"
                      size="sm"
                      variant="glass"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <EntitlementsSummary entitlements={entitlements} />

      {/* Project builds */}
      <section className="mt-14">
        <h2 className="font-display text-lg font-bold text-foreground">Project builds</h2>
        <p className="mt-1 text-sm text-foreground/50">
          Upload a zip of your build — we&apos;ll review and deploy it for you.
        </p>
        <div className="mt-4">
          <UploadBuild
            storageMb={entitlements.storage_mb}
            maxFileMb={entitlements.max_file_mb}
            allowedFileTypes={entitlements.allowed_file_types}
            maxBuilds={entitlements.max_builds}
            usedBytes={entitlements.usage.storage_used_bytes}
            buildsCount={entitlements.usage.builds_count}
          />
        </div>
        <BuildsList builds={builds} />
      </section>

      {/* Add-on services */}
      <AddOnServices cards={addOnCards} />

      {/* Service requests */}
      <section className="mt-14">
        <h2 className="font-display text-lg font-bold text-foreground">Your requests</h2>
        <p className="mt-1 text-sm text-foreground/50">
          Track the add-on services you&apos;ve requested.
        </p>
        <ServiceRequestsList requests={serviceRequests} />
      </section>

      {/* Support chat */}
      <section className="mt-14">
        <SupportChat userId={user.id} />
      </section>

      {/* Order history */}
      <section className="mt-14">
        <h2 className="font-display text-lg font-bold text-foreground">Order history</h2>
        {orders.length === 0 ? (
          <p className="glass mt-4 rounded-3xl p-8 text-center text-foreground/50">
            No orders yet.
          </p>
        ) : (
          <div className="glass shadow-layered mt-4 overflow-hidden rounded-3xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-foreground/10 text-foreground/45">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Plan</th>
                    <th className="px-5 py-3 font-medium">Duration</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Reference</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {orders.map((order) => (
                    <tr key={order.id} className="text-foreground/75">
                      <td className="whitespace-nowrap px-5 py-3.5">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-5 py-3.5">{order.plan?.name ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-foreground/60">
                        {CYCLE_LABELS[order.billing_cycle]}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        {formatMoney(
                          Number(order.amount),
                          order.currency as CurrencyCode,
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-foreground/40">
                        {order.paystack_reference}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={ORDER_TONE[order.status]}>
                          {order.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
