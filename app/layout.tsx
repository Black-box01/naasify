import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  weight: ["500", "600", "700", "800"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Runs before first paint: seeds the `.dark` class on <html> from the stored
 * preference (localStorage) or, on first visit, the OS `prefers-color-scheme`.
 * Inline + blocking so there is no light/dark flash on load.
 */
const themeScript = `(function(){try{var r=document.documentElement;var s=localStorage.getItem("naasify-theme");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "NAASIFY — Backend-as-a-Service Marketplace",
    template: "%s — NAASIFY",
  },
  description:
    "NAASIFY sells the cloud resources your product needs: backend & frontend hosting, SMTP emailing, databases, storage, domain names, cloud computing, VPS and VPN — one subscription, one dashboard.",
  keywords: [
    "backend as a service",
    "cloud hosting",
    "VPS",
    "VPN",
    "SMTP",
    "database hosting",
    "NAASIFY",
  ],
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "NAASIFY — Backend-as-a-Service Marketplace",
    description:
      "Hosting, databases, email, storage, domains, compute, VPS and VPN — one subscription.",
    url: siteUrl,
    siteName: "NAASIFY",
    images: [{ url: "/logo.png", width: 178, height: 124, alt: "NAASIFY" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "NAASIFY — Backend-as-a-Service Marketplace",
    description:
      "Hosting, databases, email, storage, domains, compute, VPS and VPN — one subscription.",
    images: ["/logo.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jakarta.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:pill focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
