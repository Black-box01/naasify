import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SITE_NAME } from "@/lib/constants";

/** Authenticated app area is private — never indexed. */
export const metadata: Metadata = {
  title: {
    default: `Dashboard — ${SITE_NAME}`,
    template: `%s — ${SITE_NAME}`,
  },
  robots: { index: false, follow: false },
};

/**
 * Authenticated app chrome (dashboard). Same floating navbar + footer as the
 * marketing site, but without the cursor-dot effect (reserved for marketing).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <Navbar />
      <main className="pt-28">{children}</main>
      <Footer />
    </div>
  );
}
