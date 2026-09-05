"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { adminFetch } from "@/lib/adminApi";
import { slugify } from "@/lib/utils";
import type { BlogPost } from "@/lib/types";

/** datetime-local input value from an ISO timestamp ("" when unset/invalid). */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** Create/edit form for a blog post. Used inside a Modal by BlogTable. */
export function BlogForm({
  post,
  onDone,
  onCancel,
}: {
  post?: BlogPost | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const editing = !!post;
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  // Once the admin edits the slug by hand we stop deriving it from the title.
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body_html ?? "");
  const [cover, setCover] = useState(post?.cover_image_url ?? "");
  const [tags, setTags] = useState((post?.tags ?? []).join(", "));
  const [published, setPublished] = useState(post?.status === "published");
  const [publishAt, setPublishAt] = useState(toLocalInput(post?.published_at));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      excerpt: excerpt.trim() || undefined,
      body_html: body,
      cover_image_url: cover.trim() || undefined,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: published ? "published" : "draft",
      published_at: publishAt || null,
    };
    try {
      await adminFetch(editing ? `/api/admin/blog/${post!.id}` : "/api/admin/blog", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label="Title"
        required
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="How NAASIFY bundles your whole backend"
      />
      <Input
        label="Slug"
        value={slug}
        onChange={(e) => {
          setSlugTouched(true);
          setSlug(e.target.value);
        }}
        placeholder="auto-from-title"
      />
      <Textarea
        label="Excerpt"
        rows={2}
        value={excerpt}
        onChange={(e) => setExcerpt(e.target.value)}
        placeholder="One or two sentences for the card + meta description."
      />
      <RichTextEditor label="Body" value={body} onChange={setBody} />
      <Input
        label="Cover image URL"
        value={cover}
        onChange={(e) => setCover(e.target.value)}
        placeholder="https://…/cover.jpg"
      />
      <Input
        label="Tags"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="cloud, hosting, paystack (comma-separated)"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Publish date"
          type="datetime-local"
          value={publishAt}
          onChange={(e) => setPublishAt(e.target.value)}
        />
        <div className="flex items-end pb-1">
          <Toggle
            label="Published"
            description="Off saves a draft; on goes live (or schedules if the date is future)."
            checked={published}
            onChange={setPublished}
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} disabled={!title.trim()}>
          {editing ? "Save changes" : "Create post"}
        </Button>
      </div>
    </form>
  );
}
