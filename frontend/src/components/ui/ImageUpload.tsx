"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { PROFILE_IMAGE_SIZE, toSquareProfileImage } from "@/lib/image";
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES } from "@/lib/uploads";

/**
 * The board's "Upload Image" panel: an empty dashed well that becomes the
 * picture once one is chosen.
 *
 * The accounting API stores only a short string for `profile_image`, so the
 * bytes go to this app's own /api/uploads route and the returned path is what
 * gets saved with the record.
 */
export function ImageUpload({
  value,
  onChange,
  label = "Upload Image",
  disabled,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function upload(file: File) {
    setError(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`That image is over ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.`);
      return;
    }

    setUploading(true);
    try {
      // Cropped to a square before it leaves the browser, so every stored
      // avatar is the same size and the original's aspect never reaches the API.
      const square = await toSquareProfileImage(file);
      const body = new FormData();
      body.append("file", square);
      const res = await fetch("/api/uploads", { method: "POST", body });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message ?? "Could not upload that image.");
      onChange(payload.url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that image.");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-[var(--text-muted)]">{label}</span>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative flex aspect-square w-full max-w-[220px] items-center justify-center overflow-hidden rounded-md border border-dashed transition-colors duration-150 ${
          dragging ? "border-[var(--accent)] bg-[var(--accent-wash)]" : "border-[var(--line-strong)]"
        } ${disabled ? "bg-[var(--surface-raised)]" : "bg-white"}`}
      >
        {value ? (
          <>
            {/* A runtime-uploaded file, not a build-time asset — next/image would
                route it through the optimizer, which only knows the build manifest. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Selected profile" className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setError(null);
                }}
                aria-label="Remove image"
                className="absolute right-2 top-2 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-white/90 text-[var(--text-muted)] shadow-sm transition-colors duration-150 hover:text-[var(--danger)]"
              >
                <X size={14} />
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1.5 text-[var(--text-subtle)] transition-colors duration-150 hover:text-[var(--text-muted)] disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <ImagePlus size={20} />
            )}
            <span className="text-[13px]">{uploading ? "Processing…" : label}</span>
            {!uploading && (
              <span className="text-[11px] text-[var(--text-subtle)]">
                Square · {PROFILE_IMAGE_SIZE}×{PROFILE_IMAGE_SIZE}
              </span>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          // Reset so picking the same file twice still fires a change.
          event.target.value = "";
        }}
      />

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}
