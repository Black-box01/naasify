"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlanForm } from "@/components/admin/PlanForm";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Icon } from "@/components/ui/icons";
import { adminFetch } from "@/lib/adminApi";
import { formatMoney } from "@/lib/money";
import { CYCLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { BillingCycle, CurrencyCode, PlanWithService, Service } from "@/lib/types";

/** Plans admin: filter by cycle/service, create/edit modal, toggle, delete. */
export function PlanTable() {
  const [plans, setPlans] = useState<PlanWithService[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlanWithService | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cycleFilter, setCycleFilter] = useState<"all" | BillingCycle>("all");
  const [serviceFilter, setServiceFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const [plansRes, servicesRes] = await Promise.all([
        adminFetch<{ plans: PlanWithService[] }>("/api/admin/plans"),
        adminFetch<{ services: Service[] }>("/api/admin/services"),
      ]);
      setPlans(plansRes.plans);
      setServices(servicesRes.services);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [plansRes, servicesRes] = await Promise.all([
          adminFetch<{ plans: PlanWithService[] }>("/api/admin/plans"),
          adminFetch<{ services: Service[] }>("/api/admin/services"),
        ]);
        if (active) {
          setPlans(plansRes.plans);
          setServices(servicesRes.services);
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
  }, []);

  const filtered = useMemo(() => {
    return plans.filter((plan) => {
      if (cycleFilter !== "all" && plan.billing_cycle !== cycleFilter) return false;
      if (serviceFilter === "bundle" && plan.service_id !== null) return false;
      if (serviceFilter !== "all" && serviceFilter !== "bundle") {
        if (plan.service_id !== serviceFilter) return false;
      }
      return true;
    });
  }, [plans, cycleFilter, serviceFilter]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(plan: PlanWithService) {
    setEditing(plan);
    setModalOpen(true);
  }

  async function toggleActive(plan: PlanWithService) {
    setBusyId(plan.id);
    try {
      await adminFetch(`/api/admin/plans/${plan.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !plan.is_active }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(plan: PlanWithService) {
    if (!confirm(`Delete plan "${plan.name}"?`)) return;
    setBusyId(plan.id);
    try {
      await adminFetch(`/api/admin/plans/${plan.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Plans</h1>
          <p className="mt-1 text-sm text-foreground/50">
            Pricing tiers per service, plus the All-in-One bundles. This is
            exactly what the pricing page shows.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Icon name="plus" className="h-4 w-4" />
          New plan
        </Button>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Billing cycle"
          value={cycleFilter}
          onChange={(e) => setCycleFilter(e.target.value as typeof cycleFilter)}
        >
          <option value="all">All cycles</option>
          {(Object.keys(CYCLE_LABELS) as BillingCycle[]).map((c) => (
            <option key={c} value={c}>
              {CYCLE_LABELS[c]}
            </option>
          ))}
        </Select>
        <Select
          label="Service"
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
        >
          <option value="all">All services</option>
          <option value="bundle">All-in-One bundles</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </Select>
      </div>

      {error && (
        <p className="glass mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">
          {error}
        </p>
      )}

      <div className="glass shadow-layered mt-6 overflow-hidden rounded-3xl">
        {loading ? (
          <p className="px-6 py-12 text-center text-foreground/50">Loading plans…</p>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-12 text-center text-foreground/50">No plans match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-foreground/10 text-foreground/45">
                <tr>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Service</th>
                  <th className="px-5 py-3 font-medium">Cycle</th>
                  <th className="px-5 py-3 font-medium">Price</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {filtered.map((plan) => (
                  <tr key={plan.id} className="text-foreground/80">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{plan.name}</span>
                        {plan.is_highlighted && (
                          <span className="pill bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-brand-300">
                            ★
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-foreground/55">
                      {plan.service_id === null ? (
                        <span className="pill bg-accent-500/15 px-2.5 py-1 text-xs font-semibold text-accent-300">
                          Bundle
                        </span>
                      ) : (
                        plan.service?.name ?? "—"
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-foreground/55">
                      {CYCLE_LABELS[plan.billing_cycle]}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-medium text-foreground">
                      {formatMoney(Number(plan.price), plan.currency as CurrencyCode)}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        disabled={busyId === plan.id}
                        onClick={() => toggleActive(plan)}
                        className={cn(
                          "pill border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50",
                          plan.is_active
                            ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                            : "border-foreground/10 bg-foreground/5 text-foreground/50 hover:bg-foreground/10",
                        )}
                      >
                        {plan.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(plan)}
                          aria-label={`Edit ${plan.name}`}
                          className="pill glass p-2 text-foreground/70 transition-colors hover:text-foreground"
                        >
                          <Icon name="edit" className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busyId === plan.id}
                          onClick={() => remove(plan)}
                          aria-label={`Delete ${plan.name}`}
                          className="pill glass p-2 text-red-300/80 transition-colors hover:bg-red-500/15 hover:text-red-200 disabled:opacity-50"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit plan" : "New plan"}
        wide
      >
        {modalOpen && (
          <PlanForm
            plan={editing}
            services={services}
            onCancel={() => setModalOpen(false)}
            onDone={() => {
              setModalOpen(false);
              void load();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
