import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/icons";
import { CONTACT_EMAIL } from "@/lib/constants";

const PRODUCT_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/#services", label: "Services" },
  { href: "/contact", label: "Contact" },
];

const COMPANY_LINKS = [
  { href: "/signup", label: "Create account" },
  { href: "/login", label: "Sign in" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-brand-400/15">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="NAASIFY logo" width={178} height={124} className="h-12 w-auto" />
            <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
              NAASIFY
            </span>
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-foreground/55">
            Backend-as-a-Service marketplace: hosting, databases, email,
            storage, domains, compute, VPS and VPN — one subscription.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="pill glass inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-accent-300 transition-colors hover:text-accent-200"
          >
            <Icon name="mail" className="h-4 w-4" />
            {CONTACT_EMAIL}
          </a>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/70">
            Product
          </h3>
          <ul className="space-y-2.5">
            {PRODUCT_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-foreground/55 transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/70">
            Account
          </h3>
          <ul className="space-y-2.5">
            {COMPANY_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-foreground/55 transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/70">
            Why NAASIFY
          </h3>
          <ul className="space-y-2.5 text-sm text-foreground/55">
            <li className="flex items-center gap-2">
              <Icon name="zap" className="h-4 w-4 text-accent-400" /> Deploy in minutes
            </li>
            <li className="flex items-center gap-2">
              <Icon name="shield" className="h-4 w-4 text-brand-400" /> Enterprise-grade security
            </li>
            <li className="flex items-center gap-2">
              <Icon name="clock" className="h-4 w-4 text-accent-400" /> 24/7 support
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-foreground/5 py-6 text-center text-xs text-foreground/40">
        © {new Date().getFullYear()} NAASIFY. All rights reserved.
      </div>
    </footer>
  );
}
