import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { getPublishedSlugsForSitemap } from "@/lib/blog";

/** Refresh daily so plan/catalog changes are reflected without a rebuild. */
export const revalidate = 86_400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Only canonical, indexable marketing routes. Billing-cycle query variants
  // (e.g. /pricing?cycle=annual) all canonicalise to /pricing, so they are
  // intentionally excluded to avoid duplicate-URL signals. Auth-protected routes
  // (/login, /signup, /dashboard, /admin/*) are omitted here and carry noindex
  // via their group layouts + robots.ts to avoid thin-content penalties.
  const staticRoutes: MetadataRoute.Sitemap = [
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
      url: absoluteUrl("/blog"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/contact"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  // Published blog posts. Wrapped in try/catch so the sitemap still renders if
  // the blog table is unavailable (e.g. before the schema migration is run).
  let postRoutes: MetadataRoute.Sitemap = [];
  try {
    const posts = await getPublishedSlugsForSitemap();
    postRoutes = posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: post.updated_at ? new Date(post.updated_at) : now,
      changeFrequency: "monthly",
      priority: 0.7,
    }));
  } catch {
    postRoutes = [];
  }

  return [...staticRoutes, ...postRoutes];
}
