"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Icon, type IconName } from "@/components/ui/icons";
import { adminFetch } from "@/lib/adminApi";
import { formatDate } from "@/lib/utils";
import {
  REQUEST_CONFIGS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TONE,
  isAddOnSlug,
  summarizeDetails,
} from "@/lib/service-requests";
import type { RequestStatus, ServiceRequestWithUser } from "@/lib/types";

const STATUSES: RequestStatus[] = ["pending", "approved", "fulfilled", "rejected"];

/**
 * Admin workspace for add-on service requests: status filter + keyset “load
 * more”, a review modal (type-specific fields, status transition, note to the
 * user) and delete-with-confirm. Mirrors BuildsTable's data-fetching shape.
 */
export function RequestsTable() {
  const [requests, setRequests] = useState<ServiceRequestWithUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<"all" | RequestStatus>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<ServiceRequestWithUser | null>(null);
  const [statusDraft, setStatusDraft] = useState<RequestStatus>("pending");
  const [noteDraft, setNoteDraft] = useState("");
  const [savingDetail, setSavingDetail] = useState(false);

  const endpoint = useCallback(
    (cursor?: string | null) => {
      const qs = new URLSearchParams();
      if (status !== "all") qs.set("status", status);
      if (cursor) qs.set("cursor", cursor);
      return `/api/admin/service-requests${qs.toString() ? `?${qs.toString()}` : ""}`;
    },
    [status],
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await adminFetch<{
          requests: ServiceRequestWithUser[];
          nextCursor: string | null;
        }>(endpoint());
        if (active) {
          setRequests(data.requests);
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
      const data = await adminFetch<{
        requests: ServiceRequestWithUser[];
        nextCursor: string | null;
      }>(endpoint(nextCursor));
      setRequests((prev) => [...prev, ...data.requests]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  function openReview(req: ServiceRequestWithUser) {
    setSelected(req);
    setStatusDraft(req.status);
    setNoteDraft(req.admin_note ?? "");
    setError(null);
  }

  async function saveReview() {
    if (!selected) return;
    setSavingDetail(true);
    setError(null);
    try {
      await adminFetch<{ request: ServiceRequestWithUser }>(
        `/api/admin/service-requests/${selected.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: statusDraft, admin_note: noteDraft }),
        },
      );
      const id = selected.id;
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: statusDraft, admin_note: noteDraft || null } : r,
        ),
      );
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update request");
    } finally {
      setSavingDetail(false);
    }
  }

  async function remove(req: ServiceRequestWithUser) {
    const label = req.service?.name ?? req.service_slug;
    if (!window.confirm(`Delete this ${label} request? This cannot be undone.`)) return;
    setBusyId(req.id);
    setError(null);
    try {
      await adminFetch(`/api/admin/service-requests/${req.id}`, { method: "DELETE" });
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete request");
    } finally {
      setBusyId(null);
    }
  }

  const selectedConfig =
    selected && isAddOnSlug(selected.service_slug)
      ? REQUEST_CONFIGS[selected.service_slug]
      : null;

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Service Requests
          </h1>
          <p className="mt-1 text-sm text-foreground/50">
            Review add-on requests, update their status and send the user a note.
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
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {REQUEST_STATUS_LABELS[s]}
              </option>
            ))}
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
          <p className="px-6 py-12 text-center text-foreground/50">Loading requests…</p>
        ) : requests.length === 0 ? (
          <p className="px-6 py-12 text-center text-foreground/50">
            No service requests yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-foreground/10 text-foreground/45">
                <tr>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Service</th>
                  <th className="px-5 py-3 font-medium">Summary</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Requested</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {requests.map((req) => (
                  <tr key={req.id} className="text-foreground/80">
                    <td className="px-5 py-3.5">
                      <span className="block text-foreground">
                        {req.user?.full_name ?? "—"}
                      </span>
                      <span className="block text-xs text-foreground/40">
                        {req.user?.email ?? req.user_id}
                      </span>
                    </td>
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
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={REQUEST_STATUS_TONE[req.status]}>
                        {REQUEST_STATUS_LABELS[req.status]}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-foreground/55">
                      {formatDate(req.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="glass" onClick={() => openReview(req)}>
                          Review
                        </Button>
                        <button
                          type="button"
                          disabled={busyId === req.id}
                          onClick={() => remove(req)}
                          className="pill inline-flex items-center gap-1.5 border border-red-400/30 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                          aria-label="Delete request"
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

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selectedConfig?.title ?? "Service request"}
        wide
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-foreground/40">User</p>
                <p className="mt-0.5 font-medium text-foreground">
                  {selected.user?.full_name ?? "—"}
                </p>
                <p className="text-xs text-foreground/45">
                  {selected.user?.email ?? selected.user_id}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-foreground/40">Service</p>
                <p className="mt-0.5 font-medium text-foreground">
                  {selected.service?.name ?? selected.service_slug}
                </p>
                <p className="text-xs text-foreground/45">
                  Requested {formatDate(selected.created_at)}
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-foreground/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/45">
                Requested details
              </p>
              {selectedConfig ? (
                <dl className="space-y-2">
                  {selectedConfig.fields.map((field) => {
                    const raw = selected.details?.[field.name];
                    const value = raw == null || raw === "" ? "—" : String(raw);
                    return (
                      <div key={field.name} className="flex justify-between gap-4 text-sm">
                        <dt className="text-foreground/50">{field.label}</dt>
                        <dd className="max-w-[60%] break-words text-right font-medium text-foreground">
                          {value}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <pre className="whitespace-pre-wrap break-words text-xs text-foreground/60">
                  {JSON.stringify(selected.details ?? {}, null, 2)}
                </pre>
              )}
            </div>

            <div className="space-y-4">
              <Select
                label="Status"
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value as RequestStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {REQUEST_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
              <Textarea
                label="Note to user (optional)"
                rows={3}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="e.g. Domain is available — we'll register it within 24h."
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelected(null)}
                disabled={savingDetail}
              >
                Cancel
              </Button>
              <Button type="button" loading={savingDetail} onClick={saveReview}>
                Save &amp; notify
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
