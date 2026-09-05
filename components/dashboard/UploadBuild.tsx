"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { BUILDS_BUCKET } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";

const MAX_BYTES = 100 * 1024 * 1024; // mirrors the bucket's file_size_limit

/**
 * Direct browser → Supabase Storage upload into the private "user-builds"
 * bucket at "{userId}/{file}", then records metadata in naasify_user_builds
 * (RLS insert-own). Refreshes the server-rendered builds list on success.
 */
export function UploadBuild({ userId }: { userId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setFile(null);
    setError(null);
    setDone(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
    setError(null);
    setDone(false);
  }

  async function upload() {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError(
        `That file is ${formatBytes(file.size)} — the maximum is ${formatBytes(MAX_BYTES)}.`,
      );
      return;
    }

    setUploading(true);
    setError(null);
    setDone(false);

    const supabase = createSupabaseBrowserClient();
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const key = `${userId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUILDS_BUCKET)
      .upload(key, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("naasify_user_builds")
      .insert({
        user_id: userId,
        file_name: file.name,
        file_key: key,
        file_size: file.size,
        mime_type: file.type || null,
        status: "pending",
      });

    setUploading(false);

    if (insertError) {
      // Row insert failed — roll back the orphaned storage object.
      await supabase.storage.from(BUILDS_BUCKET).remove([key]);
      setError(insertError.message);
      return;
    }

    reset();
    setDone(true);
    router.refresh();
  }

  return (
    <div className="glass shadow-layered rounded-3xl p-6">
      <h3 className="font-display text-base font-bold text-foreground">
        Upload project build
      </h3>
      <p className="mt-1 text-sm text-foreground/50">
        Ship a zip (or any single file) of your build — we&apos;ll review and deploy it.
      </p>

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
            : `ZIP or any file · up to ${formatBytes(MAX_BYTES)}`}
        </span>
        <input
          id="build-file"
          ref={inputRef}
          type="file"
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
        <Button onClick={upload} loading={uploading} disabled={!file}>
          {!uploading && <Icon name="upload" className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Upload build"}
        </Button>
        {file && !uploading && (
          <Button variant="ghost" size="sm" onClick={reset}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
