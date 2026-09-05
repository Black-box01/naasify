import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/icons";
import { formatBytes } from "@/lib/utils";
import type { ResolvedEntitlements } from "@/lib/entitlements";

const MB = 1024 * 1024;

/**
 * At-a-glance summary of what the user's active plan(s) unlock: storage usage,
 * build allowance, permitted file types and how many add-on services they may
 * request. Rendered by the dashboard server page from the resolved entitlements.
 */
export function EntitlementsSummary({
  entitlements,
}: {
  entitlements: ResolvedEntitlements;
}) {
  if (!entitlements.hasActivePlan) {
    return (
      <section className="mt-14">
        <h2 className="font-display text-lg font-bold text-foreground">Your plan</h2>
        <div className="glass mt-4 rounded-3xl p-8 text-center">
          <p className="text-foreground/60">
            Activate a plan to unlock uploads, storage and add-on services.
          </p>
        </div>
      </section>
    );
  }

  const storageBytes = entitlements.storage_mb * MB;
  const used = entitlements.usage.storage_used_bytes;
  const pct =
    storageBytes > 0 ? Math.min(100, Math.round((used / storageBytes) * 100)) : 0;
  const addOnCount = Object.keys(entitlements.addons).length;
  const anyType = entitlements.allowed_file_types.includes("*");

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-foreground">Your plan</h2>
        <div className="flex flex-wrap gap-2">
          {entitlements.planNames.map((name) => (
            <Badge key={name} tone="brand">
              {name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="glass shadow-layered mt-4 grid grid-cols-1 gap-6 rounded-3xl p-6 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-foreground/70">
              <Icon name="drive" className="h-4 w-4 text-accent-300" />
              Storage
            </span>
            <span className="text-xs text-foreground/45">
              {storageBytes > 0
                ? `${formatBytes(used)} / ${formatBytes(storageBytes)}`
                : "Not included"}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div>
          <span className="flex items-center gap-2 text-sm font-medium text-foreground/70">
            <Icon name="box" className="h-4 w-4 text-accent-300" />
            Project builds
          </span>
          <p className="mt-2 text-sm text-foreground/55">
            {entitlements.max_builds > 0
              ? `${entitlements.usage.builds_count} of ${entitlements.max_builds} used`
              : "Not included in this plan"}
          </p>
        </div>

        <div>
          <span className="flex items-center gap-2 text-sm font-medium text-foreground/70">
            <Icon name="upload" className="h-4 w-4 text-accent-300" />
            Allowed file types
          </span>
          <p className="mt-2 text-sm text-foreground/55">
            {anyType
              ? "Any file type"
              : entitlements.allowed_file_types.length
                ? entitlements.allowed_file_types.map((t) => `.${t}`).join(", ")
                : "None"}
          </p>
        </div>

        <div>
          <span className="flex items-center gap-2 text-sm font-medium text-foreground/70">
            <Icon name="sparkle" className="h-4 w-4 text-accent-300" />
            Add-on services
          </span>
          <p className="mt-2 text-sm text-foreground/55">
            {addOnCount > 0
              ? `${addOnCount} available to request`
              : "None included — upgrade to add"}
          </p>
        </div>
      </div>
    </section>
  );
}
