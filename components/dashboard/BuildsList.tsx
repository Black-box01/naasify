import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/icons";
import { BUILD_STATUS_LABELS } from "@/lib/constants";
import { formatBytes, formatDate } from "@/lib/utils";
import type { BuildStatus, UserBuild } from "@/lib/types";

const TONE: Record<BuildStatus, "warning" | "accent" | "success"> = {
  pending: "warning",
  processing: "accent",
  completed: "success",
};

/** The signed-in user's uploaded builds (rendered by the dashboard server page). */
export function BuildsList({ builds }: { builds: UserBuild[] }) {
  if (builds.length === 0) {
    return (
      <p className="glass mt-4 rounded-3xl p-8 text-center text-foreground/50">
        No builds uploaded yet.
      </p>
    );
  }

  return (
    <div className="glass shadow-layered mt-4 overflow-hidden rounded-3xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-foreground/10 text-foreground/45">
            <tr>
              <th className="px-5 py-3 font-medium">File</th>
              <th className="px-5 py-3 font-medium">Size</th>
              <th className="px-5 py-3 font-medium">Uploaded</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/5">
            {builds.map((build) => (
              <tr key={build.id} className="text-foreground/80">
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <Icon name="box" className="h-4 w-4 shrink-0 text-foreground/40" />
                    <span className="truncate">{build.file_name}</span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-foreground/55">
                  {formatBytes(build.file_size)}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-foreground/55">
                  {formatDate(build.uploaded_at)}
                </td>
                <td className="px-5 py-3.5">
                  <Badge tone={TONE[build.status]}>
                    {BUILD_STATUS_LABELS[build.status]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
