import type { Metadata } from "next";
import Link from "next/link";
import { AnimatedGradient } from "@/components/effects/AnimatedGradient";
import { BlogCard } from "@/components/blog/BlogCard";
import { Icon } from "@/components/ui/icons";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPublishedPosts } from "@/lib/blog";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Blog",
  description:
    "Guides, product updates and deep-dives on cloud hosting, databases, SMTP email, storage, domains, VPS, VPN and payments from the NAASIFY team.",
  path: "/blog",
  keywords: [
    "NAASIFY blog",
    "cloud hosting guides",
    "backend as a service articles",
    "BaaS blog",
    "VPS hosting",
    "Paystack payments",
  ],
});

export const dynamic = "force-dynamic";

const PER_PAGE = 9;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const requested = Number(params.page);
  const page =
    Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 1;

  const { posts, total } = await getPublishedPosts(page, PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="relative">
      <section className="relative overflow-hidden pb-6 pt-8 sm:pt-12">
        <AnimatedGradient orbs={false} />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="pill glass inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-accent-300">
            <Icon name="book-open" className="h-4 w-4" />
            Blog
          </span>
          <h1 className="font-display mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Guides &amp; <span className="text-gradient">updates</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-foreground/60 sm:text-lg">
            Practical articles on hosting, databases, email, storage, VPS, VPN and
            payments — plus product news from the NAASIFY team.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        {posts.length === 0 ? (
          <div className="glass mt-4 rounded-3xl p-12 text-center">
            <p className="text-foreground/60">
              No posts published yet. Please check back soon.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>

            {totalPages > 1 && (
              <nav
                className="mt-12 flex items-center justify-center gap-3"
                aria-label="Pagination"
              >
                {page > 1 ? (
                  <Link
                    href={`/blog?page=${page - 1}`}
                    className="pill glass inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
                  >
                    <Icon name="arrow-right" className="h-4 w-4 rotate-180" />
                    Newer
                  </Link>
                ) : (
                  <span className="pill px-4 py-2 text-sm text-foreground/30">Newer</span>
                )}
                <span className="text-sm text-foreground/50">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={`/blog?page=${page + 1}`}
                    className="pill glass inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
                  >
                    Older
                    <Icon name="arrow-right" className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="pill px-4 py-2 text-sm text-foreground/30">Older</span>
                )}
              </nav>
            )}
          </>
        )}
      </section>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />
    </div>
  );
}
