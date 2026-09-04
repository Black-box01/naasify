"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { adminFetch } from "@/lib/adminApi";
import { BILLING_CYCLES, CYCLE_LABELS } from "@/lib/constants";
import type { PlanWithService, Service } from "@/lib/types";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
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
