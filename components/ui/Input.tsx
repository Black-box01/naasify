import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <label className="block text-left" htmlFor={inputId}>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-foreground/70">
          {label}
        </span>
      )}
      <input
        id={inputId}
        className={cn(
          "pill glass w-full px-5 py-2.5 text-sm text-foreground placeholder-foreground/35",
          "transition-colors focus:border-accent-400/60 focus:outline-none",
          className,
        )}
        {...props}
      />
    </label>
  );
}
