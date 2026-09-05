import type { Metadata } from "next";
import { AnimatedGradient } from "@/components/effects/AnimatedGradient";
import { SITE_NAME } from "@/lib/constants";

/**
 * Auth pages are crawlable (so this tag is actually read) but kept out of the
 * index — thin, private entry points rather than content we want ranking.
 */
export const metadata: Metadata = {
  title: {
    default: `Sign in — ${SITE_NAME}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: `Sign in or create your ${SITE_NAME} account — instant access, no email verification required.`,
  robots: { index: false, follow: false },
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
