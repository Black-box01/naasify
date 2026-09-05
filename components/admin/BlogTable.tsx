"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BlogForm } from "@/components/admin/BlogForm";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Icon } from "@/components/ui/icons";
import { adminFetch } from "@/lib/adminApi";
import { formatDate } from "@/lib/utils";
import type { BlogPostStatus, BlogPostWithAuthor } from "@/lib/types";

type Filter = "all" | BlogPostStatus;

/** Blog admin: list + status filter + date sort + create/edit modal + delete. */
export function BlogTable() {
  const [posts, setPosts] = useState<BlogPostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPostWithAuthor | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sortDesc, setSortDesc] = useState(true);

  const load = useCallback(async (status: Filter) => {
    try {
      const qs = status === "all" ? "" : `?status=${status}`;
      const data = await adminFetch<{ posts: BlogPostWithAuthor[] }>(
        `/api/admin/blog${qs}`,
      );
      setPosts(data.posts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await adminFetch<{ posts: BlogPostWithAuthor[] }>(
          "/api/admin/blog",
        );
        if (active) {
          setPosts(data.posts);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const sorted = useMemo(() => {
    const key = (p: BlogPostWithAuthor) =>
      new Date(p.published_at ?? p.created_at).getTime();
    return [...posts].sort((a, b) => (sortDesc ? key(b) - key(a) : key(a) - key(b)));
  }, [posts, sortDesc]);

  function onFilterChange(value: string) {
    const next = value as Filter;
    setFilter(next);
    setLoading(true);
    void load(next);
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(post: BlogPostWithAuthor) {
    setEditing(post);
    setModalOpen(true);
  }

  async function togglePublish(post: BlogPostWithAuthor) {
    setBusyId(post.id);
    const nextStatus: BlogPostStatus =
      post.status === "published" ? "draft" : "published";
    try {
      await adminFetch(`/api/admin/blog/${post.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await load(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(post: BlogPostWithAuthor) {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setBusyId(post.id);
    try {
      await adminFetch(`/api/admin/blog/${post.id}`, { method: "DELETE" });
      await load(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Blog</h1>
          <p className="mt-1 text-sm text-foreground/50">
            Publish SEO/AEO content. Drafts stay hidden from the site and crawlers.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Icon name="plus" className="h-4 w-4" />
          New post
        </Button>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="w-48">
          <Select
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </Select>
        </div>
        <button
          type="button"
          onClick={() => setSortDesc((v) => !v)}
          className="pill glass inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
        >
          <Icon name="clock" className="h-4 w-4" />
          Date: {sortDesc ? "Newest first" : "Oldest first"}
        </button>
      </div>

      {error && (
        <p
          className="glass mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="glass shadow-layered mt-6 overflow-hidden rounded-3xl">
        {loading ? (
          <p className="px-6 py-12 text-center text-foreground/50">Loading posts…</p>
        ) : sorted.length === 0 ? (
          <p className="px-6 py-12 text-center text-foreground/50">
            No posts here yet. Create your first one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-foreground/10 text-foreground/45">
                <tr>
                  <th className="px-5 py-3 font-medium">Post</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Author</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {sorted.map((post) => (
                  <tr key={post.id} className="text-foreground/80">
                    <td className="px-5 py-3.5">
                      <p className="max-w-sm truncate font-medium text-foreground">
                        {post.title}
                      </p>
                      <p className="font-mono text-xs text-foreground/40">/{post.slug}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        disabled={busyId === post.id}
                        onClick={() => togglePublish(post)}
                        title={
                          post.status === "published"
                            ? "Click to revert to draft"
                            : "Click to publish"
                        }
                        className="transition-opacity disabled:opacity-50"
                      >
                        <Badge tone={post.status === "published" ? "success" : "neutral"}>
                          {post.status === "published" ? "Published" : "Draft"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-foreground/50">
                      {post.author?.full_name || post.author?.email || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-foreground/50">
                      {formatDate(post.published_at ?? post.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {post.status === "published" && (
                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`View ${post.title}`}
                            className="pill glass p-2 text-foreground/70 transition-colors hover:text-foreground"
                          >
                            <Icon name="eye" className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(post)}
                          aria-label={`Edit ${post.title}`}
                          className="pill glass p-2 text-foreground/70 transition-colors hover:text-foreground"
                        >
                          <Icon name="edit" className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busyId === post.id}
                          onClick={() => remove(post)}
                          aria-label={`Delete ${post.title}`}
                          className="pill glass p-2 text-red-300/80 transition-colors hover:bg-red-500/15 hover:text-red-200 disabled:opacity-50"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit post" : "New post"}
        wide
      >
        {modalOpen && (
          <BlogForm
            post={editing}
            onCancel={() => setModalOpen(false)}
            onDone={() => {
              setModalOpen(false);
              void load(filter);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
