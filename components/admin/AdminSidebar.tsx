"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icons";
import { SignOutButton } from "@/components/SignOutButton";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: IconName; exact?: boolean }[] = [
  { href: "/admin", label: "Overview", icon: "dashboard", exact: true },
  { href: "/admin/services", label: "Services", icon: "layers" },
  { href: "/admin/plans", label: "Plans", icon: "tag" },
  { href: "/admin/orders", label: "Orders", icon: "credit-card" },
  { href: "/admin/builds", label: "Builds", icon: "box" },
  { href: "/admin/requests", label: "Requests", icon: "clipboard" },
  { href: "/admin/messages", label: "Messages", icon: "inbox" },
  { href: "/admin/support", label: "Support", icon: "message-circle" },
  { href: "/admin/blog", label: "Blog", icon: "book-open" },
];

/** Admin pill sidebar (desktop) / horizontal pill bar (mobile). */
export function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-8 hidden h-fit shrink-0 lg:block">
        <nav className="glass shadow-layered w-60 rounded-3xl p-4" aria-label="Admin">
          <div className="flex items-center gap-2 px-2 pb-4">
            <Image src="/logo.png" alt="NAASIFY" width={178} height={124} className="h-9 w-auto" />
            <span className="font-display text-base font-extrabold text-foreground">
              NAASIFY
            </span>
            <span className="pill ml-auto bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-brand-300">
              ADMIN
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "pill flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive(item.href, item.exact)
                    ? "bg-gradient-to-r from-brand-500/25 to-accent-500/20 text-foreground"
                    : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground",
                )}
              >
                <Icon name={item.icon} className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 border-t border-foreground/10 pt-4">
            <Link
              href="/"
              className="pill flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <Icon name="arrow-right" className="h-4 w-4" />
              View site
            </Link>
            <div className="px-2 pt-1">
              <SignOutButton />
            </div>
          </div>
        </nav>
      </aside>

      {/* Mobile pill bar */}
      <nav
        className="glass shadow-layered mb-6 flex gap-1 overflow-x-auto rounded-full p-1.5 lg:hidden"
        aria-label="Admin"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "pill flex shrink-0 items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors",
              isActive(item.href, item.exact)
                ? "bg-gradient-to-r from-brand-500 to-accent-500 text-white"
                : "text-foreground/60 hover:text-foreground",
            )}
          >
            <Icon name={item.icon} className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
