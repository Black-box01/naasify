import type { Metadata } from "next";
import { AnimatedGradient } from "@/components/effects/AnimatedGradient";

export const metadata: Metadata = {
  title: {
    default: "Sign in — NAASIFY",
    template: "%s — NAASIFY",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <AnimatedGradient className="opacity-70" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
