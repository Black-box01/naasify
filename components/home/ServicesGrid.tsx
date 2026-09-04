import { Icon, type IconName } from "@/components/ui/icons";
import type { Service } from "@/lib/types";

/** Nine glass service cards with icons and hover lift. */
export function ServicesGrid({ services }: { services: Service[] }) {
  return (
    <section id="services" className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
          One platform, <span className="text-gradient">every cloud service</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-foreground/60">
          Each service is published with quarterly, half-yearly and annual
          plans — or grab the All-in-One bundle and get everything.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <div
            key={service.id}
            className="glass shadow-layered group rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-layered-lg"
          >
            <span className="pill inline-flex bg-gradient-to-br from-brand-500/25 to-accent-500/25 p-3 text-accent-300 transition-colors group-hover:text-foreground">
              <Icon name={(service.icon_key || "box") as IconName} className="h-6 w-6" />
            </span>
            <h3 className="font-display mt-5 text-lg font-bold text-foreground">
              {service.name}
            </h3>
            {service.description && (
              <p className="mt-2 text-sm leading-relaxed text-foreground/55">
                {service.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
