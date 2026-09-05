"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { adminFetch } from "@/lib/adminApi";
import { BILLING_CYCLES, CYCLE_LABELS } from "@/lib/constants";
import { ADD_ON_SLUGS } from "@/lib/service-requests";
import type { PlanEntitlements, PlanWithService, Service } from "@/lib/types";

/** Friendly labels for the requestable add-on services. */
const ADD_ON_LABELS: Record<string, string> = {
  "domain-names": "Domain registration",
  "smtp-emailing": "SMTP emailing",
  vps: "VPS instances",
  vpn: "VPN access",
};

type AddOnState = Record<string, { enabled: boolean; quota: string }>;

/** Seed the per-add-on toggle/quota controls from a plan's entitlements. */
function initialAddons(ent: Partial<PlanEntitlements>): AddOnState {
  const addons: AddOnState = {};
  for (const slug of ADD_ON_SLUGS) {
    const q = ent.addons?.[slug] ?? 0;
    addons[slug] = { enabled: q > 0, quota: q > 0 ? String(q) : "1" };
  }
  return addons;
}

/** Create/edit form for a plan. service_id null = an All-in-One style bundle. */
export function PlanForm({
  plan,
  services,
  onDone,
  onCancel,
}: {
  plan?: PlanWithService | null;
  services: Service[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const editing = !!plan;
  const [serviceId, setServiceId] = useState(plan?.service_id ?? "");
  const [name, setName] = useState(plan?.name ?? "");
  const [cycle, setCycle] = useState(plan?.billing_cycle ?? "annual");
  const [price, setPrice] = useState(plan?.price ?? "");
  const [currency, setCurrency] = useState(plan?.currency ?? "NGN");
  const [features, setFeatures] = useState((plan?.features ?? []).join("\n"));
  const [isHighlighted, setIsHighlighted] = useState(plan?.is_highlighted ?? false);
  const [isActive, setIsActive] = useState(plan?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(String(plan?.sort_order ?? 0));
  const planEnt = (plan?.entitlements ?? {}) as Partial<PlanEntitlements>;
  const [storageMb, setStorageMb] = useState(String(planEnt.storage_mb ?? 0));
  const [maxFileMb, setMaxFileMb] = useState(String(planEnt.max_file_mb ?? 0));
  const [maxBuilds, setMaxBuilds] = useState(String(planEnt.max_builds ?? 0));
  const [allowedTypes, setAllowedTypes] = useState(
    (planEnt.allowed_file_types ?? []).join(", "),
  );
  const [addons, setAddons] = useState<AddOnState>(() => initialAddons(planEnt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const addonEntries: Record<string, number> = {};
    for (const slug of ADD_ON_SLUGS) {
      const a = addons[slug];
      if (a?.enabled) {
        const q = Number(a.quota);
        addonEntries[slug] = Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;
      }
    }
    const entitlements = {
      storage_mb: Math.max(0, Math.floor(Number(storageMb) || 0)),
      max_file_mb: Math.max(0, Math.floor(Number(maxFileMb) || 0)),
      allowed_file_types: allowedTypes.includes("*")
        ? ["*"]
        : allowedTypes
            .split(",")
            .map((t) => t.trim().toLowerCase().replace(/^\./, ""))
            .filter(Boolean),
      max_builds: Math.max(0, Math.floor(Number(maxBuilds) || 0)),
      addons: addonEntries,
    };
    const payload = {
      service_id: serviceId === "" ? null : serviceId,
      name: name.trim(),
      billing_cycle: cycle,
      price: Number(price),
      currency,
      features: features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      entitlements,
      is_highlighted: isHighlighted,
      is_active: isActive,
      sort_order: Number(sortOrder) || 0,
    };
    try {
      await adminFetch(editing ? `/api/admin/plans/${plan!.id}` : "/api/admin/plans", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  const valid = name.trim().length > 0 && price !== "" && Number(price) >= 0;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Select
        label="Service"
        value={serviceId}
        onChange={(e) => setServiceId(e.target.value)}
      >
        <option value="">All-in-One bundle (no single service)</option>
        {services.map((service) => (
          <option key={service.id} value={service.id}>
            {service.name}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Plan name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="All-in-One"
        />
        <Select
          label="Billing cycle"
          value={cycle}
          onChange={(e) => setCycle(e.target.value as typeof cycle)}
        >
          {BILLING_CYCLES.map((c) => (
            <option key={c} value={c}>
              {CYCLE_LABELS[c]}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Price"
          type="number"
          min={0}
          step="0.01"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="350000"
        />
        <Select
          label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as typeof currency)}
        >
          <option value="NGN">NGN (₦)</option>
          <option value="USD">USD ($)</option>
        </Select>
        <Input
          label="Sort order"
          type="number"
          min={0}
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
      </div>

      <Textarea
        label="Features (one per line)"
        rows={5}
        value={features}
        onChange={(e) => setFeatures(e.target.value)}
        placeholder={"All 9 services\nUnlimited projects\nPriority support"}
      />

      <div className="space-y-4 rounded-2xl border border-foreground/10 p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground/80">Entitlements</h3>
          <p className="mt-0.5 text-xs text-foreground/40">
            What this plan unlocks. Storage or build limits of 0 disable project uploads.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Storage (MB)"
            type="number"
            min={0}
            value={storageMb}
            onChange={(e) => setStorageMb(e.target.value)}
            placeholder="51200"
          />
          <Input
            label="Max file (MB)"
            type="number"
            min={0}
            value={maxFileMb}
            onChange={(e) => setMaxFileMb(e.target.value)}
            placeholder="500"
          />
          <Input
            label="Max builds"
            type="number"
            min={0}
            value={maxBuilds}
            onChange={(e) => setMaxBuilds(e.target.value)}
            placeholder="100"
          />
        </div>

        <div>
          <Input
            label="Allowed file types"
            value={allowedTypes}
            onChange={(e) => setAllowedTypes(e.target.value)}
            placeholder="zip, tar, gz  —  or * for any"
          />
          <p className="mt-1.5 text-xs text-foreground/40">
            Comma-separated extensions. Use <span className="font-mono">*</span> to allow any
            file type.
          </p>
        </div>

        <div className="space-y-3 border-t border-foreground/10 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
            Add-on services
          </p>
          {ADD_ON_SLUGS.map((slug) => {
            const a = addons[slug];
            const label = ADD_ON_LABELS[slug] ?? slug;
            return (
              <div key={slug} className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <Toggle
                    label={label}
                    checked={a.enabled}
                    onChange={(checked) =>
                      setAddons((prev) => ({
                        ...prev,
                        [slug]: { ...prev[slug], enabled: checked },
                      }))
                    }
                  />
                </div>
                <div className="w-28 shrink-0">
                  <Input
                    type="number"
                    min={1}
                    aria-label={`${label} request quota`}
                    disabled={!a.enabled}
                    value={a.quota}
                    onChange={(e) =>
                      setAddons((prev) => ({
                        ...prev,
                        [slug]: { ...prev[slug], quota: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-foreground/40">
            The number is how many concurrent requests a user may keep open for that service.
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-foreground/10 p-4">
        <Toggle
          label="Highlighted"
          description="Show the “Most Popular” badge and lift this card."
          checked={isHighlighted}
          onChange={setIsHighlighted}
        />
        <Toggle
          label="Active"
          description="Inactive plans are hidden from the public pricing page."
          checked={isActive}
          onChange={setIsActive}
        />
      </div>

      {error && (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} disabled={!valid}>
          {editing ? "Save changes" : "Create plan"}
        </Button>
      </div>
    </form>
  );
}
