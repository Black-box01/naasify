import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SITE_NAME } from "@/lib/constants";
import {
  DEFAULT_KEYWORDS,
  OG_IMAGE,
  SEO_DESCRIPTION,
  SITE_URL,
  absoluteUrl,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

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

/**
 * Runs before first paint: seeds the `.dark` class on <html> from the stored
 * preference (localStorage) or, on first visit, the OS `prefers-color-scheme`.
 * Inline + blocking so there is no light/dark flash on load.
 */
const themeScript = `(function(){try{var r=document.documentElement;var s=localStorage.getItem("naasify-theme");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: `${SITE_NAME} — Backend-as-a-Service Marketplace`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SEO_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  alternates: {
    canonical: absoluteUrl("/"),
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Backend-as-a-Service Marketplace`,
    description: SEO_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Backend-as-a-Service Marketplace`,
    description: SEO_DESCRIPTION,
    images: [OG_IMAGE.url],
    creator: "@naasify",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  ...(googleVerification
    ? { verification: { google: googleVerification } }
    : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4fd" },
    { media: "(prefers-color-scheme: dark)", color: "#070312" },
  ],
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
        {/* Sitewide entity graph: who publishes this site (AEO/SEO). */}
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
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
