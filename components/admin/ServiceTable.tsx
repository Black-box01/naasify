"use client";

import { useCallback, useEffect, useState } from "react";
import { ServiceForm } from "@/components/admin/ServiceForm";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/icons";
import { adminFetch } from "@/lib/adminApi";
import { cn } from "@/lib/utils";
import type { Service } from "@/lib/types";

/** Services admin: list + create/edit modal + inline active toggle + delete. */
export function ServiceTable() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await adminFetch<{ services: Service[] }>("/api/admin/services");
      setServices(data.services);
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
        const data = await adminFetch<{ services: Service[] }>("/api/admin/services");
        if (active) {
          setServices(data.services);
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

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(service: Service) {
    setEditing(service);
    setModalOpen(true);
  }

  async function toggleActive(service: Service) {
    setBusyId(service.id);
    try {
      await adminFetch(`/api/admin/services/${service.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !service.is_active }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(service: Service) {
    if (!confirm(`Delete "${service.name}"? Its plans will also be deleted.`)) return;
    setBusyId(service.id);
    try {
      await adminFetch(`/api/admin/services/${service.id}`, { method: "DELETE" });
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
          <h1 className="font-display text-3xl font-bold text-foreground">Services</h1>
          <p className="mt-1 text-sm text-foreground/50">
            Cloud services customers can subscribe to. Deactivate to hide one.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Icon name="plus" className="h-4 w-4" />
          New service
        </Button>
      </header>

      {error && (
        <p className="glass mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">
          {error}
        </p>
      )}

      <div className="glass shadow-layered mt-6 overflow-hidden rounded-3xl">
        {loading ? (
          <p className="px-6 py-12 text-center text-foreground/50">Loading services…</p>
        ) : services.length === 0 ? (
          <p className="px-6 py-12 text-center text-foreground/50">
            No services yet. Create your first one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-foreground/10 text-foreground/45">
                <tr>
                  <th className="px-5 py-3 font-medium">Service</th>
                  <th className="px-5 py-3 font-medium">Slug</th>
                  <th className="px-5 py-3 font-medium">Order</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {services.map((service) => (
                  <tr key={service.id} className="text-foreground/80">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="pill inline-flex bg-foreground/5 p-2 text-accent-300">
                          <Icon
                            name={(service.icon_key || "box") as IconName}
                            className="h-4 w-4"
                          />
                        </span>
                        <div>
                          <p className="font-medium text-foreground">{service.name}</p>
                          {service.description && (
                            <p className="max-w-xs truncate text-xs text-foreground/40">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-foreground/45">
                      {service.slug}
                    </td>
                    <td className="px-5 py-3.5 text-foreground/50">{service.sort_order}</td>
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        disabled={busyId === service.id}
                        onClick={() => toggleActive(service)}
                        className={cn(
                          "pill border px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50",
                          service.is_active
                            ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                            : "border-foreground/10 bg-foreground/5 text-foreground/50 hover:bg-foreground/10",
                        )}
                      >
                        {service.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(service)}
                          aria-label={`Edit ${service.name}`}
                          className="pill glass p-2 text-foreground/70 transition-colors hover:text-foreground"
                        >
                          <Icon name="edit" className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busyId === service.id}
                          onClick={() => remove(service)}
                          aria-label={`Delete ${service.name}`}
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
        title={editing ? "Edit service" : "New service"}
        wide
      >
        {modalOpen && (
          <ServiceForm
            service={editing}
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
