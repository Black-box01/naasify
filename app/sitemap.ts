import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/** Refresh daily so plan/catalog changes are reflected without a rebuild. */
export const revalidate = 86_400;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Only canonical, indexable marketing routes. Billing-cycle query variants
  // (e.g. /pricing?cycle=annual) all canonicalise to /pricing, so they are
  // intentionally excluded to avoid duplicate-URL signals.
  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/services"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/pricing"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/contact"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
