import Image from "next/image";
import { requireAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SignOutButton } from "@/components/SignOutButton";

/**
 * Admin shell. `requireAdmin()` redirects signed-out users to /login and
 * non-admins to /dashboard (proxy.ts + every /api/admin route also enforce
 * this — defense in depth).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Mobile header */}
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="NAASIFY" width={178} height={124} className="h-9 w-auto" />
          <span className="font-display text-base font-extrabold text-foreground">
            NAASIFY
          </span>
          <span className="pill bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-brand-300">
            ADMIN
          </span>
        </div>
        <SignOutButton />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <AdminSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
