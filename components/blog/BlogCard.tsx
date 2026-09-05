import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { formatDate } from "@/lib/utils";
import type { BlogPostWithAuthor } from "@/lib/types";

/**
 * Blog listing card (server component). Cover images are admin-supplied remote
 * URLs, so a plain <img> is used — next/image has no remotePatterns configured.
 */
export function BlogCard({ post }: { post: BlogPostWithAuthor }) {
  const author = post.author?.full_name || post.author?.email || "NAASIFY";
  const when = post.published_at ?? post.created_at;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="glass shadow-layered group flex flex-col overflow-hidden rounded-3xl transition-transform duration-200 hover:-translate-y-1"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-brand-500/30 to-accent-500/20">
        {post.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image_url}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-accent-300">
            <Icon name="book-open" className="h-10 w-10 opacity-60" />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        {post.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="pill bg-brand-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-brand-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <h2 className="font-display text-lg font-bold text-foreground transition-colors group-hover:text-accent-300">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="mt-2 line-clamp-3 text-sm text-foreground/60">{post.excerpt}</p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-5 text-xs text-foreground/45">
          <span className="font-medium text-foreground/70">{author}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={when}>{formatDate(when)}</time>
        </div>
      </div>
    </Link>
  );
}
