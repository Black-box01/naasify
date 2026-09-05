import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminPosts } from "@/lib/blog";
import { blogPostSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";
import type { BlogPostStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Resolve a slug that does not collide with an existing post. Admins can read
 * every row (RLS `naasify_is_admin()`), so drafts are included in the check.
 */
async function uniqueSlug(supabase: Supabase, base: string): Promise<string> {
  const root = base || "post";
  let candidate = root;
  for (let i = 2; i <= 50; i++) {
    const { data } = await supabase
      .from("naasify_blog_posts")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

/**
 * A published post always carries a timestamp (explicit schedule or "now");
 * a draft keeps an optional future date so it can be scheduled ahead of time.
 */
function normalizePublishDate(
  status: BlogPostStatus,
  raw?: string | null,
): string | null {
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return status === "published" ? new Date().toISOString() : null;
}

/** List posts for the admin table, optionally filtered by status. */
export async function GET(request: Request) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;

  const status = new URL(request.url).searchParams.get("status");
  const filter: BlogPostStatus | undefined =
    status === "draft" || status === "published" ? status : undefined;

  const posts = await getAdminPosts(filter);
  return NextResponse.json({ posts });
}

/** Create a post. Slug is derived from the title (or supplied) and de-duped. */
export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;

  const body = await request.json().catch(() => null);
  const parsed = blogPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid post" },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const supabase = await createSupabaseServerClient();

  const baseSlug = input.slug?.trim() ? slugify(input.slug) : slugify(input.title);
  const slug = await uniqueSlug(supabase, baseSlug);
  const status: BlogPostStatus = input.status ?? "draft";

  const { data, error } = await supabase
    .from("naasify_blog_posts")
    .insert({
      slug,
      title: input.title.trim(),
      excerpt: input.excerpt?.trim() || null,
      body_html: input.body_html ?? "",
      cover_image_url: input.cover_image_url?.trim() || null,
      tags: input.tags ?? [],
      author_id: guard.user.id,
      status,
      published_at: normalizePublishDate(status, input.published_at),
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ post: data }, { status: 201 });
}
