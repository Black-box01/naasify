"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { adminFetch } from "@/lib/adminApi";
import type { Service } from "@/lib/types";

const ICON_OPTIONS = [
  "server",
  "monitor",
  "mail",
  "database",
  "drive",
  "globe",
  "cpu",
  "box",
  "shield",
  "layers",
  "zap",
  "tag",
  "credit-card",
  "inbox",
];

/** Create/edit form for a single service. Used inside a Modal by ServiceTable. */
export function ServiceForm({
  service,
  onDone,
  onCancel,
}: {
  service?: Service | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const editing = !!service;
  const [name, setName] = useState(service?.name ?? "");
  const [slug, setSlug] = useState(service?.slug ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [iconKey, setIconKey] = useState(service?.icon_key ?? "box");
  const [sortOrder, setSortOrder] = useState(String(service?.sort_order ?? 0));
  const [isActive, setIsActive] = useState(service?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || undefined,
      icon_key: iconKey,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
    };
    try {
      await adminFetch(
        editing ? `/api/admin/services/${service!.id}` : "/api/admin/services",
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label="Name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Backend Hosting"
      />
      <Input
        label="Slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="auto-from-name"
      />
      <Textarea
        label="Description"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Managed backend hosting with autoscaling…"
      />
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Icon"
          value={iconKey}
          onChange={(e) => setIconKey(e.target.value)}
        >
          {ICON_OPTIONS.map((icon) => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </Select>
        <Input
          label="Sort order"
          type="number"
          min={0}
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
      </div>
      <Toggle
        label="Active"
        description="Inactive services are hidden from the public site."
        checked={isActive}
        onChange={setIsActive}
      />
      {error && (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} disabled={!name.trim()}>
          {editing ? "Save changes" : "Create service"}
        </Button>
      </div>
    </form>
  );
}
