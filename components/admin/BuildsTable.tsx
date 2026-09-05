"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Icon } from "@/components/ui/icons";
import { adminFetch } from "@/lib/adminApi";
import { formatBytes, formatDate } from "@/lib/utils";
import { BUILD_STATUS_LABELS } from "@/lib/constants";
import type { BuildStatus, UserBuild } from "@/lib/types";

const TONE: Record<BuildStatus, "warning" | "accent" | "success"> = {
  pending: "warning",
  processing: "accent",
  completed: "success",
};

/** User builds admin: status filter + keyset “load more”, download / deploy / delete. */
export function BuildsTable() {
  const [builds, setBuilds] = useState<UserBuild[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<"all" | BuildStatus>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useCallback(
    (cursor?: string | null) => {
      const qs = new URLSearchParams();
      if (status !== "all") qs.set("status", status);
      if (cursor) qs.set("cursor", cursor);
      return `/api/admin/builds${qs.toString() ? `?${qs.toString()}` : ""}`;
    },
    [status],
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await adminFetch<{ builds: UserBuild[]; nextCursor: string | null }>(
          endpoint(),
        );
        if (active) {
          setBuilds(data.builds);
          setNextCursor(data.nextCursor);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [endpoint]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await adminFetch<{ builds: UserBuild[]; nextCursor: string | null }>(
        endpoint(nextCursor),
      );
      setBuilds((prev) => [...prev, ...data.builds]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  async function markDeployed(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await adminFetch(`/api/admin/builds/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      });
      setBuilds((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "completed" } : b)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update build");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, fileName: string) {
    if (!window.confirm(`Delete “${fileName}”? This removes the stored file too.`)) return;
    setBusyId(id);
    setError(null);
    try {
      await adminFetch(`/api/admin/builds/${id}`, { method: "DELETE" });
      setBuilds((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete build");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">User Builds</h1>
          <p className="mt-1 text-sm text-foreground/50">
            Download a build, deploy it, then mark it as completed.
          </p>
        </div>
        <div className="w-48">
          <Select
            label="Status"
            value={status}
            onChange={(e) => {
              setLoading(true);
              setStatus(e.target.value as typeof status);
            }}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Deployed</option>
          </Select>
        </div>
      </header>

      {error && (
        <p
          className="glass mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="glass shadow-layered mt-6 overflow-hidden rounded-3xl">
        {loading ? (
          <p className="px-6 py-12 text-center text-foreground/50">Loading builds…</p>
        ) : builds.length === 0 ? (
          <p className="px-6 py-12 text-center text-foreground/50">No builds uploaded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-foreground/10 text-foreground/45">
                <tr>
                  <th className="px-5 py-3 font-medium">File</th>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Size</th>
                  <th className="px-5 py-3 font-medium">Uploaded</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {builds.map((build) => (
                  <tr key={build.id} className="text-foreground/80">
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <Icon name="box" className="h-4 w-4 shrink-0 text-foreground/40" />
                        <span className="max-w-[16rem] truncate">{build.file_name}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="block text-foreground">
                        {build.user?.full_name ?? "—"}
                      </span>
                      <span className="block text-xs text-foreground/40">
                        {build.user?.email ?? build.user_id}
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
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/admin/builds/${build.id}/download`}
                          className="pill inline-flex items-center gap-1.5 border border-foreground/15 px-3 py-1.5 text-xs font-semibold text-foreground/70 transition-colors hover:border-accent-400/50 hover:text-foreground"
                        >
                          <Icon name="download" className="h-3.5 w-3.5" />
                          Download
                        </a>
                        {build.status !== "completed" && (
                          <Button
                            size="sm"
                            variant="glass"
                            loading={busyId === build.id}
                            onClick={() => markDeployed(build.id)}
                          >
                            Mark deployed
                          </Button>
                        )}
                        <button
                          type="button"
                          disabled={busyId === build.id}
                          onClick={() => remove(build.id, build.file_name)}
                          className="pill inline-flex items-center gap-1.5 border border-red-400/30 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                          aria-label={`Delete ${build.file_name}`}
                        >
                          <Icon name="trash" className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {nextCursor && (
        <div className="mt-6 flex justify-center">
          <Button variant="glass" loading={loadingMore} onClick={loadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
