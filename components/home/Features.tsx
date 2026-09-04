import { Icon, type IconName } from "@/components/ui/icons";

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "zap",
    title: "Instant activation",
    body: "Payment confirms, your services spin up automatically — no waiting on tickets or sales calls.",
  },
  {
    icon: "shield",
    title: "Secure by default",
    body: "Row-level security, signed webhooks and idempotent payment handling keep your account and money safe.",
  },
  {
    icon: "credit-card",
    title: "Pay in USD or naira",
    body: "Live currency conversion with Paystack checkout — cards and bank transfer, quarterly to annual.",
  },
  {
    icon: "layers",
    title: "Bundle everything",
    body: "The All-in-One plan stacks all nine services into a single bill, so you never juggle vendors again.",
  },
  {
    icon: "clock",
    title: "Your cycle, your rules",
    body: "Quarterly, half-yearly or annual billing — switch cycles whenever your runway changes.",
  },
  {
    icon: "inbox",
    title: "Humans on support",
    body: "Message us anytime at info@naasify.com and get a real engineer, not a chatbot loop.",
  },
];

/** Why-NAASIFY glass feature grid. */
export function Features() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          Why teams pick <span className="text-gradient">NAASIFY</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-foreground/60">
          Built like the cloud you always wanted: transparent pricing, instant
          provisioning and support that answers.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="glass shadow-layered rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1"
          >
            <span className="pill inline-flex bg-gradient-to-br from-brand-500/25 to-accent-500/25 p-3 text-brand-300">
              <Icon name={feature.icon} className="h-5 w-5" />
            </span>
            <h3 className="font-display mt-4 text-base font-bold text-foreground">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/55">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
