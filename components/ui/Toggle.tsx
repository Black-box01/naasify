"use client";

import { cn } from "@/lib/utils";

/** Accessible pill switch used for boolean flags (is_active, is_highlighted). */
export function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 text-left"
    >
      <span>
        <span className="block text-sm font-medium text-foreground/80">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-foreground/40">{description}</span>
        )}
      </span>
      <span
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
          checked
            ? "border-accent-400/60 bg-gradient-to-r from-brand-500 to-accent-500"
            : "border-foreground/15 bg-foreground/10",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </span>
    </button>
  );
}
