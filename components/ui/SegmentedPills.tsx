"use client";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** Pill segmented control — used for billing-cycle and currency toggles. */
export function SegmentedPills<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="glass pill inline-flex items-center gap-1 p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          type="button"
          aria-selected={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "pill px-4 py-1.5 text-xs font-semibold transition-all duration-200 sm:text-sm",
            option.value === value
              ? "bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-layered"
              : "text-foreground/60 hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
