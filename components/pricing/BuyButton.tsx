"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";
type Variant = "primary" | "glass" | "outline";

/**
 * Launches a login-gated purchase. Clicking navigates straight to the
 * /checkout/start server route, which charges signed-in buyers immediately
 * (hosted gateway) or bounces signed-out visitors to /login with a ?next that
 * resumes the SAME purchase afterwards — never back to /pricing. The amount is
 * always recomputed server-side, so the client sends only the plan id.
 */
export function BuyButton({
  planId,
  planName,
  label = "Get Started",
  variant = "primary",
  size = "md",
  className,
  authenticated,
  returnTo = "/pricing",
}: {
  planId: string;
  planName: string;
  label?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  authenticated: boolean;
  returnTo?: string;
}) {
  const [loading, setLoading] = useState(false);
  const missingPlan = !planId;

  function onClick() {
    if (missingPlan || loading) return;
    setLoading(true);
    const start = `/checkout/start?planId=${encodeURIComponent(planId)}&return=${encodeURIComponent(returnTo)}`;
    // Signed in → charge now. Signed out → log in, then resume this purchase.
    window.location.assign(
      authenticated ? start : `/login?next=${encodeURIComponent(start)}`,
    );
  }

  return (
    <div className="w-full">
      <Button
        type="button"
        variant={variant}
        size={size}
        loading={loading}
        onClick={onClick}
        className={cn("w-full", className)}
        aria-label={`Purchase the ${planName} plan`}
      >
        {label}
      </Button>
      {missingPlan ? (
        <p className="mt-2 text-center text-xs text-red-300" role="alert">
          This plan is not available for purchase.
        </p>
      ) : (
        <p className="mt-2 text-center text-xs text-foreground/40">
          Secure checkout
        </p>
      )}
    </div>
  );
}
