import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "glass" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "btn-shine bg-gradient-to-r from-brand-500 via-brand-400 to-accent-500 text-white shadow-layered hover:brightness-110",
  glass: "glass text-foreground hover:bg-foreground/10",
  ghost: "text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
  outline:
    "border border-accent-400/40 text-accent-300 hover:border-accent-300 hover:bg-accent-500/10",
};

const SIZES: Record<Size, string> = {
  sm: "px-4 py-1.5 text-xs",
  md: "px-6 py-2.5 text-sm",
  lg: "px-8 py-3.5 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "pill inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200",
        "focus-visible:outline-2 focus-visible:outline-accent-400",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/40 border-t-white"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
