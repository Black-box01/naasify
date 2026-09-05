"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icons";
import { isAddOnSlug, type AddOnSlug } from "@/lib/service-requests";
import { ServiceRequestForm } from "@/components/dashboard/ServiceRequestForm";

export interface AddOnCard {
  id: string;
  name: string;
  slug: string;
  iconKey: string;
  /** Max concurrent requests the plan grants for this service (0 = not included). */
  quota: number;
  /** Slots still free right now (quota minus active requests). */
  remaining: number;
}

/**
 * Add-on services the user may request. Eligibility is decided server-side and
 * passed in as plain `cards`; this component only renders it and gates the
 * Request action. Ineligible services show a locked card that links to pricing
 * rather than an actionable control, so the UI mirrors the API's enforcement.
 */
export function AddOnServices({ cards }: { cards: AddOnCard[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<AddOnCard | null>(null);

  const selectedSlug: AddOnSlug | null =
    selected && isAddOnSlug(selected.slug) ? selected.slug : null;

  return (
    <section className="mt-14">
      <h2 className="font-display text-lg font-bold text-foreground">Add-on services</h2>
      <p className="mt-1 text-sm text-foreground/50">
        Request the extras included in your plan — our team reviews every request.
      </p>

      {cards.length === 0 ? (
        <p className="glass mt-4 rounded-3xl p-8 text-center text-foreground/50">
          No add-on services are available right now.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {cards.map((card) => {
            const eligible = card.remaining > 0;
            const atCapacity = !eligible && card.quota > 0;
            return (
              <div
                key={card.id}
                className="glass shadow-layered flex flex-col rounded-3xl p-6"
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`pill inline-flex shrink-0 p-3 ${
                      eligible
                        ? "bg-gradient-to-br from-brand-500/25 to-accent-500/25 text-accent-300"
                        : "bg-foreground/5 text-foreground/35"
                    }`}
                  >
                    <Icon
                      name={eligible ? (card.iconKey as IconName) : "lock"}
                      className="h-5 w-5"
                    />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold text-foreground">
                      {card.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-foreground/45">
                      {eligible
                        ? `${card.remaining} of ${card.quota} request${
                            card.quota === 1 ? "" : "s"
                          } available`
                        : atCapacity
                          ? "Plan limit reached"
                          : "Not included in your plan"}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  {eligible ? (
                    <button
                      type="button"
                      onClick={() => setSelected(card)}
                      className="pill inline-flex w-full items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-layered transition-all hover:brightness-110"
                    >
                      <Icon name="plus" className="h-4 w-4" />
                      Request
                    </button>
                  ) : (
                    <Link
                      href="/pricing"
                      className="pill inline-flex w-full items-center justify-center gap-2 border border-foreground/15 px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:border-accent-400/50 hover:text-foreground"
                    >
                      <Icon name="lock" className="h-4 w-4" />
                      {atCapacity ? "Upgrade for more" : "Upgrade to unlock"}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && selectedSlug && (
        <ServiceRequestForm
          key={selectedSlug}
          slug={selectedSlug}
          onClose={() => setSelected(null)}
          onSubmitted={() => {
            setSelected(null);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
