import type { Metadata } from "next";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/constants";
import type { Plan, Service } from "@/lib/types";

/**
 * Central SEO + AEO (Answer Engine Optimization) configuration.
 *
 * Everything derives from a single canonical site URL so metadata, canonicals,
 * the sitemap, robots, manifest, JSON-LD and social images all agree. Override
 * the domain with NEXT_PUBLIC_SITE_URL (defaults to the production brand).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://naasify.online"
).replace(/\/+$/, "");

export const SITE_LOCALE = "en_US";

/** Long, keyword-rich description used for meta + structured data. */
export const SEO_DESCRIPTION =
  "NAASIFY is a Backend-as-a-Service (BaaS) marketplace that bundles cloud hosting, databases, SMTP email, storage, domain names, cloud computing, VPS and VPN into simple quarterly, half-yearly and annual plans — with instant activation, USD or naira payments via Paystack, and 24/7 human support.";

/** Optional social profiles (comma-separated URLs) feed Organization `sameAs`. */
const SOCIAL_PROFILES = (process.env.NEXT_PUBLIC_SOCIAL_LINKS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const DEFAULT_KEYWORDS = [
  "backend as a service",
  "BaaS",
  "cloud hosting",
  "database hosting",
  "SMTP email service",
  "cloud storage",
  "domain registration",
  "cloud computing",
  "VPS hosting",
  "VPN service",
  "NAASIFY",
];

/** Build an absolute URL from a path. */
export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * The generated 1200×630 social card (see app/opengraph-image.tsx). Referenced
 * explicitly so every page — including those that override `openGraph` — shares
 * one rich social image instead of falling back to the small logo or nothing.
 */
export const OG_IMAGE = {
  url: absoluteUrl("/opengraph-image"),
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — Backend-as-a-Service Marketplace`,
  type: "image/png" as const,
};

export interface PageSeo {
  /** Short page title — the root "%s — NAASIFY" template appends the brand. */
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  type?: "website" | "article";
  /** Set true for private/auth/utility pages that must not be indexed. */
  noIndex?: boolean;
}

/** Consistent per-page metadata: title, canonical, Open Graph, Twitter, robots. */
export function buildMetadata({
  title,
  description,
  path = "/",
  keywords,
  type = "website",
  noIndex = false,
}: PageSeo): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = `${title} — ${SITE_NAME}`;
  return {
    title,
    description,
    keywords: keywords ?? DEFAULT_KEYWORDS,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      locale: SITE_LOCALE,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [OG_IMAGE.url],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
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
  };
}

/* ------------------------------------------------------------------ *
 * AEO: FAQ content — shared by the visible FAQ section and FAQPage
 * schema so the on-page answer and the structured data always match.
 * ------------------------------------------------------------------ */
export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is NAASIFY?",
    answer:
      "NAASIFY is a Backend-as-a-Service (BaaS) marketplace. Instead of contracting nine separate cloud vendors, you subscribe to the infrastructure your product needs — hosting, databases, email, storage, domains, compute, VPS and VPN — through one dashboard and one bill.",
  },
  {
    question: "What cloud services does NAASIFY offer?",
    answer:
      "NAASIFY publishes nine core services: backend hosting, frontend hosting, SMTP emailing, database hosting, cloud storage, domain names, cloud computing, VPS (virtual private servers) and VPN. Each is available on its own or as part of the All-in-One bundle.",
  },
  {
    question: "How much does NAASIFY cost?",
    answer:
      "Every service is published with transparent quarterly, half-yearly and annual plans, priced in US dollars or Nigerian naira. The All-in-One bundle stacks all nine services into a single subscription. See the pricing page for live, current figures with no hidden fees.",
  },
  {
    question: "What billing cycles can I choose?",
    answer:
      "You can pay quarterly (3 months), half-yearly (6 months) or annually (12 months). Annual billing is the lowest effective rate, and you can switch cycles whenever your runway changes.",
  },
  {
    question: "Can I pay in naira?",
    answer:
      "Yes. NAASIFY checks out with Paystack and supports both cards and bank transfer, in USD or NGN, using a live exchange rate so the naira price is always accurate.",
  },
  {
    question: "How fast are services activated?",
    answer:
      "Activation is instant. As soon as Paystack confirms your payment, your subscription is provisioned automatically — no tickets, no sales calls, no waiting.",
  },
  {
    question: "Do I need to verify my email to create an account?",
    answer:
      "No. Signing up is instant: create an account with your email and password and you are taken straight to your dashboard, where all of your purchases and their durations are recorded.",
  },
  {
    question: "How do I manage my subscription?",
    answer:
      "From your NAASIFY dashboard. Every purchase is listed with its plan, billing cycle, start date and expiry date, so you can see exactly what is active, when it renews and what it cost — all in one place, with no need to contact support.",
  },
  {
    question: "What happens when my subscription expires?",
    answer:
      "NAASIFY emails you a renewal reminder seven days before a subscription ends. If it lapses, the service is marked expired in your dashboard and you can renew at any time by checking out again — your data and settings are preserved.",
  },
  {
    question: "Who can access the NAASIFY admin dashboard?",
    answer:
      "Only team members whose profile role is set to admin. The admin console at /admin is protected three ways — the page layout, the middleware proxy and every /api/admin route all re-check the admin role — and it is blocked from search engines with a noindex rule.",
  },
  {
    question: "How do I upload my project for deployment?",
    answer:
      "Open your dashboard, go to Builds and upload your project archive (up to 100 MB). The file is stored in a private bucket, appears in your build history with its status, and the NAASIFY team is notified to deploy it. Admins download it through a secure, signed link.",
  },
  {
    question: "Does NAASIFY send email confirmations and receipts?",
    answer:
      "Yes. Email is sent automatically for the key account events — a welcome message when you sign up, a payment receipt when an order is confirmed, a renewal reminder before a subscription expires, and a notification when support replies. These transactional emails do not require you to verify your address first.",
  },
  {
    question: "Is my connection and payment data secure?",
    answer:
      "Yes. NAASIFY serves everything over HTTPS, never stores raw card details, and delegates payment processing to Paystack, a PCI-DSS compliant gateway. Webhook events are verified with an HMAC-SHA512 signature and de-duplicated by event id, and database access is locked down with row-level security.",
  },
  {
    question: "How do I contact NAASIFY support?",
    answer: `Email ${CONTACT_EMAIL} any time, or use the support chat inside your dashboard for a real-time thread with our engineers. Support is handled by real people — usually within one business day — not a chatbot.`,
  },
];

/* ------------------------------------------------------------------ *
 * JSON-LD structured data builders
 * ------------------------------------------------------------------ */

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: "NAASIFY",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/logo.png"),
      width: 178,
      height: 124,
    },
    description: SEO_DESCRIPTION,
    email: CONTACT_EMAIL,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: CONTACT_EMAIL,
      availableLanguage: ["English"],
    },
    ...(SOCIAL_PROFILES.length ? { sameAs: SOCIAL_PROFILES } : {}),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: SEO_DESCRIPTION,
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en",
  };
}

export function faqJsonLd(items: FaqItem[] = FAQ_ITEMS) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function breadcrumbJsonLd(
  crumbs: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/** ItemList of schema.org/Service for the services page. */
export function servicesJsonLd(services: Service[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${SITE_NAME} cloud services`,
    itemListElement: services.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Service",
        name: service.name,
        description: service.description ?? undefined,
        provider: { "@id": `${SITE_URL}/#organization` },
        areaServed: "Worldwide",
        url: absoluteUrl("/services"),
      },
    })),
  };
}

/**
 * BlogPosting JSON-LD for an individual article. Surfaces rich results
 * (headline, image, author, publish/modified dates) and gives answer engines a
 * canonical, machine-readable version of the post.
 */
export function articleJsonLd(post: {
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  authorName?: string | null;
  publishedAt: string;
  updatedAt?: string | null;
  tags?: string[] | null;
}) {
  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.coverImageUrl ? [post.coverImageUrl] : [OG_IMAGE.url],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: {
      "@type": "Person",
      name: post.authorName ?? SITE_NAME,
      url: SITE_URL,
    },
    publisher: { "@id": `${SITE_URL}/#organization` },
    ...(post.tags?.length ? { keywords: post.tags.join(", ") } : {}),
    inLanguage: "en",
  };
}

/**
 * SoftwareApplication with an AggregateOffer computed from live plans —
 * surfaces price range rich results on the pricing page.
 */
export function pricingJsonLd(plans: Plan[]) {
  const numeric = plans
    .map((p) => ({ price: Number(p.price), currency: p.currency }))
    .filter((p) => Number.isFinite(p.price) && p.price > 0);

  const prices = numeric.map((p) => p.price);
  const currency = numeric.find((p) => p.currency === "NGN")?.currency
    ?? numeric[0]?.currency
    ?? "USD";

  const offers = prices.length
    ? {
        "@type": "AggregateOffer",
        lowPrice: Math.min(...prices).toFixed(2),
        highPrice: Math.max(...prices).toFixed(2),
        priceCurrency: currency,
        offerCount: prices.length,
        availability: "https://schema.org/InStock",
        url: absoluteUrl("/pricing"),
      }
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: SEO_DESCRIPTION,
    url: absoluteUrl("/pricing"),
    publisher: { "@id": `${SITE_URL}/#organization` },
    ...(offers ? { offers } : {}),
  };
}
