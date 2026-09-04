import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CursorDots } from "@/components/effects/CursorDots";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <CursorDots />
      <Navbar />
      <main className="pt-28">{children}</main>
      <Footer />
    </div>
  );
}
