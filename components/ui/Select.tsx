import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, className, id, children, ...props }: SelectProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <label className="block text-left" htmlFor={inputId}>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-foreground/70">
          {label}
        </span>
      )}
      <select
        id={inputId}
        className={cn(
          "pill glass w-full appearance-none px-5 py-2.5 text-sm text-foreground",
          "transition-colors focus:border-accent-400/60 focus:outline-none",
          "[&>option]:bg-white [&>option]:text-[#17102b] dark:[&>option]:bg-[#0d0720] dark:[&>option]:text-[#f4f2ff]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
