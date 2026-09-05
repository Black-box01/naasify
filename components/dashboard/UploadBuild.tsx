"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { BUILDS_BUCKET } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";

const MB = 1024 * 1024;

interface UploadBuildProps {
  /** Aggregate storage quota (MB) granted by the user's active plan(s). */
  storageMb: number;
  /** Per-file cap (MB). */
  maxFileMb: number;
  /** Allowed extensions (no dot); ["*"] = any type. */
  allowedFileTypes: string[];
  /** Maximum number of build records. */
  maxBuilds: number;
  /** Bytes already stored across the user's builds. */
  usedBytes: number;
  /** Number of builds the user already has. */
  buildsCount: number;
}

/**
 * Plan-gated project upload.
 *
 * The server is authoritative: this component asks POST /api/builds to validate
 * the plan's storage quota + allowed file types and issue a single-object signed
 * URL, then uploads the bytes with uploadToSignedUrl. If the upload fails, the
 * staged row is rolled back via DELETE /api/builds/[id]. Client-side checks only
 * give instant feedback; ineligible plans never see an enabled control.
 */
export function UploadBuild({
  storageMb,
  maxFileMb,
  allowedFileTypes,
  maxBuilds,
  usedBytes,
  buildsCount,
}: UploadBuildProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const entitled = storageMb > 0 && maxBuilds > 0;
  const remainingBytes = Math.max(0, storageMb * MB - usedBytes);
  const buildLimitReached = buildsCount >= maxBuilds;
  const storageFull = remainingBytes <= 0;
  const quotaReached = buildLimitReached || storageFull;
  const allowsAny = allowedFileTypes.includes("*");
  const accept = allowsAny ? undefined : allowedFileTypes.map((t) => `.${t}`).join(",");

  function validate(f: File): string | null {
    const ext = f.name.includes(".") ? f.name.split(".").pop()!.toLowerCase() : "";
    if (!allowsAny && !allowedFileTypes.includes(ext)) {
      return `.${ext || "?"} files aren't allowed on your plan (allowed: ${allowedFileTypes.join(", ") || "none"}).`;
    }
    if (maxFileMb > 0 && f.size > maxFileMb * MB) {
      return `That file is over your ${maxFileMb} MB per-file limit.`;
    }
    if (f.size > remainingBytes) {
      return `That upload would exceed your remaining ${formatBytes(remainingBytes)} of storage.`;
    }
    return null;
  }

  function reset() {
    setFile(null);
    setError(null);
    setDone(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setDone(false);
    setError(picked ? validate(picked) : null);
  }

  async function upload() {
    if (!file) return;
    const msg = validate(file);
    if (msg) {
      setError(msg);
      return;
    }

    setUploading(true);
    setError(null);
    setDone(false);

    // 1) Server-side entitlement gate + signed upload URL + staged row.
    const res = await fetch("/api/builds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      build?: { id: string };
      fileKey?: string;
      token?: string;
      error?: string;
    };
    if (!res.ok || !data.build || !data.fileKey || !data.token) {
      setError(data.error || `Upload failed (${res.status})`);
      setUploading(false);
      return;
    }

    // 2) Upload the bytes straight to Storage using the signed URL.
    const supabase = createSupabaseBrowserClient();
    const { error: uploadError } = await supabase.storage
      .from(BUILDS_BUCKET)
      .uploadToSignedUrl(data.fileKey, data.token, file, {
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      // Roll back the staged row so it doesn't count against the quota.
      await fetch(`/api/builds/${data.build.id}`, { method: "DELETE", cache: "no-store" });
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    setUploading(false);
    reset();
    setDone(true);
    router.refresh();
  }

  // No upload right at all on this plan.
  if (!entitled) {
    return (
      <div className="glass shadow-layered rounded-3xl p-6">
        <h3 className="font-display flex items-center gap-2 text-base font-bold text-foreground">
          <Icon name="lock" className="h-4 w-4 text-foreground/40" />
          Upload project build
        </h3>
        <p className="mt-2 text-sm text-foreground/55">
          Project uploads aren&apos;t included in your current plan. Upgrade to deploy your
          builds with NAASIFY.
        </p>
        <Link
          href="/pricing"
          className="pill mt-5 inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-accent-500 px-6 py-2.5 text-sm font-semibold text-white shadow-layered transition-all hover:brightness-110"
        >
          View plans
          <Icon name="arrow-right" className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="glass shadow-layered rounded-3xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-foreground">
            Upload project build
          </h3>
          <p className="mt-1 text-sm text-foreground/50">
            Ship a build — we&apos;ll review and deploy it for you.
          </p>
        </div>
        <div className="text-right text-xs text-foreground/45">
          <p>
            {formatBytes(usedBytes)} of {formatBytes(storageMb * MB)} used
          </p>
          <p>
            {buildsCount} of {maxBuilds} builds ·{" "}
            {allowsAny ? "any file type" : `${allowedFileTypes.join(", ")}`}
          </p>
          {maxFileMb > 0 && <p>up to {formatBytes(maxFileMb * MB)} per file</p>}
        </div>
      </div>

      {quotaReached ? (
        <p className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {buildLimitReached
            ? `You've reached your ${maxBuilds}-build limit on this plan.`
            : "You've used your full storage quota for this plan."}{" "}
          <Link href="/pricing" className="font-semibold underline underline-offset-2">
            Upgrade for more
          </Link>
          .
        </p>
      ) : (
        <>
          <label
            htmlFor="build-file"
            className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-foreground/20 bg-foreground/[0.03] px-6 py-8 text-center transition-colors hover:border-accent-400/50 hover:bg-foreground/[0.06]"
          >
            <Icon name="upload" className="h-6 w-6 text-accent-300" />
            <span className="text-sm font-medium text-foreground/80">
              {file ? file.name : "Choose a file or drag it here"}
            </span>
            <span className="text-xs text-foreground/40">
              {file
                ? formatBytes(file.size)
                : `${allowsAny ? "Any file" : allowedFileTypes.join(", ").toUpperCase()} · up to ${formatBytes(maxFileMb * MB || remainingBytes)}`}
            </span>
            <input
              id="build-file"
              ref={inputRef}
              type="file"
              accept={accept}
              onChange={onPick}
              className="hidden"
            />
          </label>

          {error && (
            <p
              className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              role="alert"
            >
              {error}
            </p>
          )}

          {done && (
            <p
              className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
              role="status"
            >
              <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0" />
              Your build has been uploaded. The admin will review and deploy it shortly.
            </p>
          )}

          <div className="mt-5 flex items-center gap-3">
            <Button onClick={upload} loading={uploading} disabled={!file || !!error}>
              {!uploading && <Icon name="upload" className="h-4 w-4" />}
              {uploading ? "Uploading…" : "Upload build"}
            </Button>
            {file && !uploading && (
              <Button variant="ghost" size="sm" onClick={reset}>
                Clear
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
