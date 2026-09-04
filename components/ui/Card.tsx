import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Highlighted tier card: brand ring + slight scale. */
  highlight?: boolean;
}

/** Glass container with layered purple/cyan shadow (2026 card style). */
export function Card({ highlight = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "glass shadow-layered rounded-3xl p-6 transition-transform duration-300",
        highlight
          ? "shadow-layered-lg ring-2 ring-brand-400/60 lg:scale-[1.04]"
          : "hover:-translate-y-1",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
