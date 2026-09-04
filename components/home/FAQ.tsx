import { FAQ_ITEMS } from "@/lib/seo";
import { Icon } from "@/components/ui/icons";

/**
 * AEO-optimised FAQ. Uses native <details>/<summary> so every answer is in the
 * initial HTML (crawlable + no client JS), phrased as direct, concise answers
 * that answer engines and featured snippets can lift verbatim. The matching
 * FAQPage JSON-LD is injected on the home page.
 */
export function FAQ() {
  return (
    <section
      id="faq"
      className="relative mx-auto max-w-4xl px-4 py-20 sm:px-6"
    >
      <div className="text-center">
        <span className="pill glass inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-accent-300">
          <Icon name="sparkle" className="h-4 w-4" />
          Answers
        </span>
        <h2 className="font-display mt-5 text-3xl font-bold text-foreground sm:text-4xl">
          Frequently asked <span className="text-gradient">questions</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-foreground/60">
          Everything you need to know about NAASIFY — what it is, what it costs
          and how fast you can go live.
        </p>
      </div>

      <div className="mt-12 flex flex-col gap-3">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.question}
            className="glass shadow-layered group rounded-2xl px-6 py-4 transition-colors open:bg-foreground/[0.03]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-display text-base font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              {item.question}
              <Icon
                name="plus"
                className="h-5 w-5 shrink-0 text-accent-300 transition-transform duration-200 group-open:rotate-45"
              />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-foreground/65">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
