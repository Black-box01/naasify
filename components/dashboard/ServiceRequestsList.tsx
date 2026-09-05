import { Badge } from "@/components/ui/Badge";
import { Icon, type IconName } from "@/components/ui/icons";
import { formatDate } from "@/lib/utils";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TONE,
  summarizeDetails,
} from "@/lib/service-requests";
import { CancelRequestButton } from "@/components/dashboard/CancelRequestButton";
import type { ServiceRequestWithUser } from "@/lib/types";

/**
 * The signed-in user's add-on service requests with live status badges. Pending
 * requests can be withdrawn; everything else is read-only (managed by admin).
 * Rendered by the dashboard server page.
 */
export function ServiceRequestsList({
  requests,
}: {
  requests: ServiceRequestWithUser[];
}) {
  if (requests.length === 0) {
    return (
      <p className="glass mt-4 rounded-3xl p-8 text-center text-foreground/50">
        You haven&apos;t requested any add-on services yet.
      </p>
    );
  }

  return (
    <div className="glass shadow-layered mt-4 overflow-hidden rounded-3xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-foreground/10 text-foreground/45">
            <tr>
              <th className="px-5 py-3 font-medium">Service</th>
              <th className="px-5 py-3 font-medium">Details</th>
              <th className="px-5 py-3 font-medium">Requested</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/5">
            {requests.map((req) => (
              <tr key={req.id} className="text-foreground/80">
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <Icon
                      name={(req.service?.icon_key || "clipboard") as IconName}
                      className="h-4 w-4 shrink-0 text-foreground/40"
                    />
                    {req.service?.name ?? req.service_slug}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-foreground/55">
                  <span className="block max-w-[18rem] truncate">
                    {summarizeDetails(req.service_slug, req.details)}
                  </span>
                  {req.admin_note && (
                    <span
                      className="mt-1 block max-w-[18rem] truncate text-xs text-foreground/40"
                      title={req.admin_note}
                    >
                      Note: {req.admin_note}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-foreground/55">
                  {formatDate(req.created_at)}
                </td>
                <td className="px-5 py-3.5">
                  <Badge tone={REQUEST_STATUS_TONE[req.status]}>
                    {REQUEST_STATUS_LABELS[req.status]}
                  </Badge>
                </td>
                <td className="px-5 py-3.5 text-right">
                  {req.status === "pending" ? (
                    <CancelRequestButton id={req.id} />
                  ) : (
                    <span className="text-xs text-foreground/30">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
