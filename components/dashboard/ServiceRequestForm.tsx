"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { REQUEST_CONFIGS, type AddOnSlug } from "@/lib/service-requests";

/** Seed the form: selects default to their first option, everything else empty. */
function initialValues(slug: AddOnSlug): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of REQUEST_CONFIGS[slug].fields) {
    values[field.name] = field.type === "select" ? (field.options[0]?.value ?? "") : "";
  }
  return values;
}

/**
 * Dynamic add-on request form. The fields and the server-side validation both
 * come from REQUEST_CONFIGS[slug], so the UI can never drift from what
 * POST /api/service-requests accepts. Number fields are coerced before sending;
 * blank optional fields are omitted.
 */
export function ServiceRequestForm({
  slug,
  onClose,
  onSubmitted,
}: {
  slug: AddOnSlug;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const config = REQUEST_CONFIGS[slug];
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(slug));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const details: Record<string, unknown> = {};
    for (const field of config.fields) {
      const raw = values[field.name] ?? "";
      if (field.type === "number") {
        const n = Number(raw);
        details[field.name] = Number.isFinite(n) ? Math.floor(n) : raw;
      } else {
        const s = raw.trim();
        if (s === "" && !field.required) continue;
        details[field.name] = s;
      }
    }

    try {
      const res = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ service_slug: slug, details }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      onSubmitted();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={config.title} wide>
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-foreground/55">{config.blurb}</p>

        {config.fields.map((field) => {
          const value = values[field.name] ?? "";
          if (field.type === "select") {
            return (
              <Select
                key={field.name}
                label={field.label}
                value={value}
                required={field.required}
                onChange={(e) => setField(field.name, e.target.value)}
              >
                {field.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            );
          }
          if (field.type === "textarea") {
            return (
              <Textarea
                key={field.name}
                label={field.label}
                rows={3}
                value={value}
                placeholder={field.placeholder}
                required={field.required}
                maxLength={field.max}
                onChange={(e) => setField(field.name, e.target.value)}
              />
            );
          }
          if (field.type === "number") {
            return (
              <Input
                key={field.name}
                label={field.label}
                type="number"
                value={value}
                required={field.required}
                min={field.min}
                max={field.max}
                step={field.step}
                onChange={(e) => setField(field.name, e.target.value)}
              />
            );
          }
          if (field.type === "text") {
            return (
              <Input
                key={field.name}
                label={field.label}
                type="text"
                value={value}
                placeholder={field.placeholder}
                required={field.required}
                maxLength={field.max}
                onChange={(e) => setField(field.name, e.target.value)}
              />
            );
          }
          return (
            <Input
              key={field.name}
              label={field.label}
              type="email"
              value={value}
              placeholder={field.placeholder}
              required={field.required}
              onChange={(e) => setField(field.name, e.target.value)}
            />
          );
        })}

        {error && (
          <p
            className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Submit request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
