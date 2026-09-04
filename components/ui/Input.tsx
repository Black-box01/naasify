"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, type = "text", ...props }: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);
  const resolvedType = isPassword ? (revealed ? "text" : "password") : type;

  const input = (
    <input
      id={inputId}
      type={resolvedType}
      className={cn(
        "pill glass w-full px-5 py-2.5 text-sm text-foreground placeholder-foreground/35",
        "transition-colors focus:border-accent-400/60 focus:outline-none",
        isPassword && "pr-12",
        className,
      )}
      {...props}
    />
  );

  return (
    <div className="block text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-foreground/70"
        >
          {label}
        </label>
      )}
      {isPassword ? (
        <div className="relative">
          {input}
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            title={revealed ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-2 text-foreground/45 transition-colors hover:text-foreground focus:outline-none focus-visible:text-foreground"
          >
            <Icon name={revealed ? "eye-off" : "eye"} className="h-5 w-5" />
          </button>
        </div>
      ) : (
        input
      )}
    </div>
  );
}
