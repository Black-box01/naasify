import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "brand" | "accent" | "success" | "warning" | "danger" | "neutral";

const TONES: Record<Tone, string> = {
  brand: "bg-brand-500/15 text-brand-300 border-brand-400/30",
  accent: "bg-accent-500/15 text-accent-300 border-accent-400/30",
  success: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  warning: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  danger: "bg-red-500/15 text-red-300 border-red-400/30",
  neutral: "bg-foreground/5 text-foreground/70 border-foreground/10",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "pill inline-flex items-center gap-1 border px-3 py-1 text-xs font-semibold",
        TONES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
