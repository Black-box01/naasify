"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

/** Floating pill-shaped glass navbar (2026 trend). */
export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the mobile sheet on route change during render (the documented
  // "adjust state when a prop changes" pattern) instead of an effect, so it
  // never triggers a cascading re-render.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <header className="fixed left-1/2 top-5 z-50 w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2">
      <nav
        className="glass-strong shadow-layered pill flex items-center justify-between gap-3 py-2 pl-3 pr-2"
        style={{ backdropFilter: "blur(20px) saturate(140%)", WebkitBackdropFilter: "blur(20px) saturate(140%)" }}
        aria-label="Main navigation"
      >
        <Link href="/" className="flex shrink-0 items-center gap-2 pl-1">
          <Image src="/logo.png" alt="NAASIFY logo" width={178} height={124} className="h-7 w-auto" priority />
          <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
            NAASIFY
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const linkPath = link.href.split("#")[0];
            // Hash anchors (e.g. "/#services") are jump links to a homepage
            // section, not routes — never mark them as the current page.
            const active = link.href.includes("#")
              ? false
              : linkPath === "/"
                ? pathname === "/"
                : pathname === linkPath || pathname.startsWith(`${linkPath}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "pill px-4 py-2 text-sm font-medium transition-colors",
                  active ? "bg-foreground/10 text-foreground" : "text-foreground/65 hover:bg-foreground/5 hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {ready && signedIn ? (
            <>
              <Link href="/dashboard">
                <Button variant="glass" size="sm">
                  <Icon name="dashboard" className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="primary" size="sm">Get Started</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/pricing">
                <Button variant="primary" size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="pill glass p-2.5 text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          <Icon name={open ? "x" : "menu"} className="h-5 w-5" />
        </button>
      </nav>

      {open && (
        <div className="glass-strong shadow-layered-lg mt-2 rounded-3xl p-4 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="pill px-4 py-2.5 text-sm font-medium text-foreground/80 hover:bg-foreground/5 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="px-1 text-sm font-medium text-foreground/70">Theme</span>
                <ThemeToggle />
              </div>
              {ready && signedIn ? (
                <Link href="/dashboard">
                  <Button variant="glass" size="md" className="w-full">Dashboard</Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button variant="glass" size="md" className="w-full">Sign in</Button>
                </Link>
              )}
              <Link href="/pricing">
                <Button variant="primary" size="md" className="w-full">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
