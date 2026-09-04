import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <label className="block text-left" htmlFor={inputId}>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-foreground/70">
          {label}
        </span>
      )}
      <textarea
        id={inputId}
        className={cn(
          "glass w-full rounded-3xl px-5 py-3.5 text-sm text-foreground placeholder-foreground/35",
          "transition-colors focus:border-accent-400/60 focus:outline-none",
          className,
        )}
        {...props}
      />
    </label>
  );
}
