"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Withdraw a still-pending add-on request. Calls DELETE /api/service-requests/[id]
 * (which enforces ownership + pending-only server-side) then refreshes the
 * server page so the row and the freed quota both update.
 */
export function CancelRequestButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (!window.confirm("Cancel this request?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/service-requests/${id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `Failed (${res.status})`);
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Failed to cancel");
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        className="pill inline-flex items-center gap-1.5 border border-red-400/30 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
      >
        {busy ? "Cancelling…" : "Cancel"}
      </button>
      {error && <span className="text-xs text-red-300">{error}</span>}
    </span>
  );
}
