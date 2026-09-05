import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { AnimatedGradient } from "@/components/effects/AnimatedGradient";
import { Icon } from "@/components/ui/icons";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPostBySlug, getRelatedPosts, readingTime, stripHtml } from "@/lib/blog";
import { CONTACT_EMAIL } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { OG_IMAGE, articleJsonLd, breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** Per-request memo so generateMetadata and the page share one fetch. */
const loadPost = cache((slug: string) => getPostBySlug(slug));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) {
    return buildMetadata({
      title: "Post not found",
      description: "The article you are looking for could not be found.",
      path: `/blog/${slug}`,
      noIndex: true,
    });
  }

  const description =
    post.excerpt?.trim() || `${stripHtml(post.body_html).slice(0, 155).trim()}…`;
  const meta = buildMetadata({
    title: post.title,
    description,
    path: `/blog/${slug}`,
    type: "article",
    keywords: post.tags.length ? post.tags : undefined,
  });

  // Prefer the post cover for social sharing; fall back to the site OG card.
  const imageUrl = post.cover_image_url ?? OG_IMAGE.url;
  const og = meta.openGraph as unknown as Record<string, unknown> | undefined;
  if (og) {
    og.images = [{ url: imageUrl }];
    og.publishedTime = post.published_at ?? undefined;
    og.modifiedTime = post.updated_at ?? undefined;
  }
  const twitter = meta.twitter as unknown as Record<string, unknown> | undefined;
  if (twitter) twitter.images = [imageUrl];

  return meta;
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();

  const related = await getRelatedPosts(post, 3);
  const minutes = readingTime(post.body_html);
  const authorName =
    post.author?.full_name || post.author?.email || "NAASIFY Team";
  const publishedIso = post.published_at ?? post.created_at;
  const showUpdated =
    new Date(post.updated_at).toDateString() !==
    new Date(publishedIso).toDateString();

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden pb-8 pt-8 sm:pt-12">
        <AnimatedGradient orbs={false} />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
          <Link
            href="/blog"
            className="pill glass inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-accent-300 transition-colors hover:text-foreground"
          >
            <Icon name="arrow-right" className="h-4 w-4 rotate-180" />
            All posts
          </Link>
          <h1 className="font-display mt-5 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-4 text-base text-foreground/60 sm:text-lg">
              {post.excerpt}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-foreground/50">
            <span className="font-medium text-foreground/75">{authorName}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={publishedIso}>{formatDate(publishedIso)}</time>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="clock" className="h-4 w-4" />
              {minutes} min read
            </span>
            {showUpdated && (
              <>
                <span aria-hidden="true">·</span>
                <span>Updated {formatDate(post.updated_at)}</span>
              </>
            )}
          </div>
          {post.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="pill bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cover image */}
      {post.cover_image_url && (
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="shadow-layered aspect-[16/9] w-full rounded-3xl object-cover"
          />
        </div>
      )}

      {/* Body + sidebar */}
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-24 pt-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article>
          <div
            className="blog-prose"
            dangerouslySetInnerHTML={{ __html: post.body_html }}
          />

          {/* Internal links back to core pages (SEO crawl depth + AEO context). */}
          <div className="glass shadow-layered mt-12 rounded-3xl p-7">
            <h2 className="font-display text-lg font-bold text-foreground">
              Ready to put this into practice?
            </h2>
            <p className="mt-2 text-sm text-foreground/60">
              Explore every NAASIFY service and its transparent pricing, or bundle
              them all into one subscription.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/services"
                className="pill inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-layered transition-all hover:brightness-110"
              >
                Browse services
                <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="pill glass inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/10"
              >
                View pricing
              </Link>
            </div>
          </div>
        </article>

        <aside className="flex flex-col gap-6">
          {/* Author bio */}
          <div className="glass shadow-layered rounded-3xl p-6">
            <div className="flex items-center gap-3">
              <span className="pill inline-flex bg-gradient-to-br from-brand-500 to-accent-500 p-3 text-white">
                <Icon name="sparkle" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-foreground/40">
                  Written by
                </p>
                <p className="font-display text-base font-bold text-foreground">
                  {authorName}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-foreground/60">
              The NAASIFY team builds and runs a Backend-as-a-Service marketplace
              bundling hosting, databases, email, storage, domains, compute, VPS
              and VPN. Questions? Reach us at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-accent-300 underline underline-offset-2"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>

          {/* Related posts */}
          {related.length > 0 && (
            <div>
              <h2 className="font-display mb-4 text-base font-bold text-foreground">
                Related reading
              </h2>
              <div className="flex flex-col gap-4">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    href={`/blog/${r.slug}`}
                    className="glass group flex gap-3 rounded-2xl p-3 transition-colors hover:bg-foreground/5"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-brand-500/30 to-accent-500/20">
                      {r.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.cover_image_url}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-accent-300">
                          <Icon name="book-open" className="h-5 w-5 opacity-60" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-accent-300">
                        {r.title}
                      </p>
                      <p className="mt-1 text-xs text-foreground/45">
                        {formatDate(r.published_at ?? r.created_at)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <JsonLd
        data={articleJsonLd({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          coverImageUrl: post.cover_image_url,
          authorName,
          publishedAt: publishedIso,
          updatedAt: post.updated_at,
          tags: post.tags,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />
    </div>
  );
}
