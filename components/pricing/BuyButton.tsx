"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";
type Variant = "primary" | "glass" | "outline";

/**
 * Starts a Paystack checkout for a plan. When the visitor is signed in we use
 * their account email; guests are prompted for an email in a modal first.
 * The API recomputes the amount from the DB plan — the client never sends one.
 */
export function BuyButton({
  planId,
  planName,
  email,
  label = "Get Started",
  variant = "primary",
  size = "md",
  className,
}: {
  planId: string;
  planName: string;
  email: string | null;
  label?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(targetEmail: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, email: targetEmail }),
      });
      const data = (await res.json()) as {
        authorization_url?: string;
        error?: string;
      };
      if (!res.ok || !data.authorization_url) {
        throw new Error(data.error || "Could not start checkout.");
      }
      window.location.href = data.authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  function onClick() {
    if (email) {
      void startCheckout(email);
    } else {
      setError(null);
      setOpen(true);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        loading={loading && !open}
        onClick={onClick}
        className={cn("w-full", className)}
      >
        {label}
      </Button>

      {error && !open && (
        <p className="mt-2 text-center text-xs text-red-300" role="alert">
          {error}
        </p>
      )}

      <Modal
        open={open}
        onClose={() => {
          if (!loading) setOpen(false);
        }}
        title={`Checkout — ${planName}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const value = guestEmail.trim();
            if (!value) return;
            setOpen(false);
            void startCheckout(value);
          }}
          className="space-y-4"
        >
          <p className="text-sm text-foreground/60">
            Enter your email to receive your receipt and activate your plan. You
            can create an account later.
          </p>
          <Input
            label="Email address"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
          />
          {error && (
            <p className="text-xs text-red-300" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading} disabled={!guestEmail.trim()}>
              Continue to payment
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
