import { createServiceClient } from "@/lib/supabase/admin";
import type { BlogPostStatus, BlogPostWithAuthor } from "@/lib/types";

/**
 * Blog/content data layer.
 *
 * Public reads use the SERVER-ONLY service client so the author profile can be
 * embedded even for signed-out visitors (profiles are otherwise RLS-private).
 * Every public query is pinned to `status = 'published'` AND a non-future
 * `published_at`, so drafts and scheduled posts never leak. Admin reads are
 * gated by `requireAdminApi()` in the route before calling `getAdminPosts()`.
 */
const AUTHOR_SELECT = "*, author:naasify_profiles(id, full_name, email)";

/** Strip HTML tags + common entities to plain text (reading time, fallbacks). */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Estimated reading time in minutes (~200 wpm), minimum 1. */
export function readingTime(html: string): number {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Paginated published posts for the public /blog listing. */
export async function getPublishedPosts(
  page = 1,
  perPage = 9,
): Promise<{ posts: BlogPostWithAuthor[]; total: number }> {
  const supabase = createServiceClient();
  const from = Math.max(0, (page - 1) * perPage);
  const to = from + perPage - 1;
  const { data, count } = await supabase
    .from("naasify_blog_posts")
    .select(AUTHOR_SELECT, { count: "exact" })
    .eq("status", "published")
    .lte("published_at", nowIso())
    .order("published_at", { ascending: false })
    .range(from, to);
  return { posts: (data ?? []) as BlogPostWithAuthor[], total: count ?? 0 };
}

/** A single published post by slug (with author), or null when not visible. */
export async function getPostBySlug(
  slug: string,
): Promise<BlogPostWithAuthor | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("naasify_blog_posts")
    .select(AUTHOR_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", nowIso())
    .maybeSingle();
  return (data as BlogPostWithAuthor | null) ?? null;
}

/** Related published posts: shared-tag overlap ranked first, then recency. */
export async function getRelatedPosts(
  post: { id: string; tags?: string[] | null },
  limit = 3,
): Promise<BlogPostWithAuthor[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("naasify_blog_posts")
    .select(AUTHOR_SELECT)
    .eq("status", "published")
    .lte("published_at", nowIso())
    .neq("id", post.id)
    .order("published_at", { ascending: false })
    .limit(limit * 3);
  const candidates = (data ?? []) as BlogPostWithAuthor[];
  const tags = new Set(post.tags ?? []);
  return candidates
    .map((p) => ({ p, score: (p.tags ?? []).filter((t) => tags.has(t)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p);
}

/** All posts (drafts + published) for the admin table, newest first. */
export async function getAdminPosts(
  status?: BlogPostStatus,
): Promise<BlogPostWithAuthor[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("naasify_blog_posts")
    .select(AUTHOR_SELECT)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query;
  return (data ?? []) as BlogPostWithAuthor[];
}

/** Published slugs + last-modified dates for sitemap generation. */
export async function getPublishedSlugsForSitemap(): Promise<
  { slug: string; updated_at: string }[]
> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("naasify_blog_posts")
    .select("slug, updated_at")
    .eq("status", "published")
    .lte("published_at", nowIso())
    .order("published_at", { ascending: false });
  return (data ?? []) as { slug: string; updated_at: string }[];
}
