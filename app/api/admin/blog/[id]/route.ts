import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { blogPostUpdateSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Slug unique across all posts except the one being updated. */
async function uniqueSlugExcluding(
  supabase: Supabase,
  base: string,
  excludeId: string,
): Promise<string> {
  const root = base || "post";
  let candidate = root;
  for (let i = 2; i <= 50; i++) {
    const { data } = await supabase
      .from("naasify_blog_posts")
      .select("id")
      .eq("slug", candidate)
      .neq("id", excludeId)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

/** Update a post (edit content, flip status, reschedule, rename, etc.). */
export async function PATCH(request: Request, { params }: Ctx) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = blogPostUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid post" },
      { status: 400 },
    );
  }
  const patch: Record<string, unknown> = { ...parsed.data };

  // Normalise an explicit publish timestamp (string -> ISO, blank -> null).
  if ("published_at" in patch) {
    const raw = patch.published_at as string | null | undefined;
    if (raw) {
      const d = new Date(raw);
      patch.published_at = Number.isNaN(d.getTime()) ? null : d.toISOString();
    } else {
      patch.published_at = null;
    }
  }
  // A post flipped to published must be visible: stamp it if no date is set.
  if (patch.status === "published" && !patch.published_at) {
    patch.published_at = new Date().toISOString();
  }

  const supabase = await createSupabaseServerClient();

  if (typeof patch.slug === "string") {
    patch.slug = await uniqueSlugExcluding(supabase, slugify(patch.slug), id);
  } else if (typeof patch.title === "string") {
    patch.slug = await uniqueSlugExcluding(supabase, slugify(patch.title), id);
  }

  const { data, error } = await supabase
    .from("naasify_blog_posts")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ post: data });
}

/** Delete a post permanently. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("naasify_blog_posts").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
