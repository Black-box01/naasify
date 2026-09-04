/**
 * Renders a JSON-LD structured-data block. Server-safe (no client JS) — used
 * to inject schema.org graphs from layouts and pages.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // JSON-LD must be raw JSON in the document head/body for crawlers.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
