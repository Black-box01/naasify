"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { adminFetch } from "@/lib/adminApi";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { CYCLE_LABELS } from "@/lib/constants";
import type { CurrencyCode, GatewayName, OrderStatus, OrderWithPlan } from "@/lib/types";

const TONE: Record<OrderStatus, "success" | "warning" | "danger" | "neutral"> = {
  paid: "success",
  pending: "warning",
  failed: "danger",
  refunded: "neutral",
};

/** Colour-code the processor so admins can reconcile Flutterwave vs Paystack. */
const GATEWAY_TONE: Record<GatewayName, "brand" | "accent"> = {
  flutterwave: "accent",
  paystack: "brand",
};

/** Orders admin: status filter + keyset “load more” pagination. */
export function OrdersTable() {
  const [orders, setOrders] = useState<OrderWithPlan[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string | null) => {
      const qs = new URLSearchParams();
      if (status !== "all") qs.set("status", status);
      if (cursor) qs.set("cursor", cursor);
      const url = `/api/admin/orders${qs.toString() ? `?${qs.toString()}` : ""}`;
      const data = await adminFetch<{ orders: OrderWithPlan[]; nextCursor: string | null }>(
        url,
      );
      setOrders((prev) => (cursor ? [...prev, ...data.orders] : data.orders));
      setNextCursor(data.nextCursor);
    },
    [status],
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const qs = new URLSearchParams();
        if (status !== "all") qs.set("status", status);
        const url = `/api/admin/orders${qs.toString() ? `?${qs.toString()}` : ""}`;
        const data = await adminFetch<{
          orders: OrderWithPlan[];
          nextCursor: string | null;
        }>(url);
        if (active) {
          setOrders(data.orders);
          setNextCursor(data.nextCursor);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [status]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      await load(nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Orders</h1>
          <p className="mt-1 text-sm text-foreground/50">
            Every checkout attempt, newest first.
          </p>
        </div>
        <div className="w-48">
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </Select>
        </div>
      </header>

      {error && (
        <p className="glass mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">
          {error}
        </p>
      )}

      <div className="glass shadow-layered mt-6 overflow-hidden rounded-3xl">
        {loading ? (
          <p className="px-6 py-12 text-center text-foreground/50">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="px-6 py-12 text-center text-foreground/50">No orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-foreground/10 text-foreground/45">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {orders.map((order) => (
                  <tr key={order.id} className="text-foreground/80">
                    <td className="whitespace-nowrap px-5 py-3.5 text-foreground/55">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-foreground">
                        {order.plan?.name ?? "—"}
                      </span>
                      <span className="block text-xs text-foreground/40">
                        {CYCLE_LABELS[order.billing_cycle]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-foreground/55">{order.email}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-medium text-foreground">
                      {formatMoney(Number(order.amount), order.currency as CurrencyCode)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="block font-mono text-xs text-foreground/40">
                        {order.paystack_reference}
                      </span>
                      <Badge
                        tone={GATEWAY_TONE[order.gateway]}
                        className="mt-1.5 px-2 py-0.5 text-[10px] font-medium capitalize"
                      >
                        {order.gateway}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={TONE[order.status]}>{order.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {nextCursor && (
        <div className="mt-6 flex justify-center">
          <Button variant="glass" loading={loadingMore} onClick={loadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
