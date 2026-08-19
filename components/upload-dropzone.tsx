"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { AlertCircle, Check, FileVideo, ImageUp, Loader2, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import { apiUrl } from "@/lib/profiles";

/**
 * File upload with the things a plain file input does not give you: drag and
 * drop, a preview before the request finishes, a real progress figure, and a
 * failure you can retry without re-picking the file.
 *
 * Uploading is where owners give up — it is usually the first thing they do on
 * a phone, over a slow connection, with a photo straight from the camera — so
 * the states that matter are "is it working" and "what went wrong", and both are
 * shown rather than implied.
 */
export type UploadedMedia = {
  url: string;
  webpUrl?: string;
  avifUrl?: string;
  mediaType?: "image" | "video";
  mimeType?: string;
  width?: number;
  height?: number;
  bytes?: number;
  originalName?: string;
};

type Props = {
  label: string;
  type: "cover" | "avatar" | "gallery" | "certificate" | "document";
  value?: string;
  admin?: boolean;
  onUploaded: (url: string, payload?: UploadedMedia) => void;
  onCleared?: () => void;
  helper?: string;
  /** Shown under the label, e.g. "JPG or PNG, up to 8MB". */
  requirement?: string;
  disabled?: boolean;
  disabledMessage?: string;
  /** Documents are private; never render their contents back to the page. */
  privateFile?: boolean;
};

const ACCEPT: Record<Props["type"], string> = {
  cover: "image/jpeg,image/png,image/webp,image/avif",
  avatar: "image/jpeg,image/png,image/webp,image/avif",
  certificate: "image/jpeg,image/png,image/webp,image/avif,application/pdf",
  document: "image/jpeg,image/png,image/webp,image/avif,application/pdf",
  gallery: "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
};

const SHAPE: Record<Props["type"], string> = {
  cover: "aspect-video w-full",
  avatar: "aspect-square w-28",
  gallery: "aspect-[3/4] w-full max-w-44",
  certificate: "aspect-[4/3] w-full max-w-56",
  document: "aspect-[4/3] w-full max-w-56"
};

function readableSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadDropzone({
  label,
  type,
  value,
  admin = false,
  onUploaded,
  onCleared,
  helper,
  requirement,
  disabled = false,
  disabledMessage,
  privateFile = false
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef("");
  const lastFileRef = useRef<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [preview, setPreview] = useState("");
  const [meta, setMeta] = useState<{ name?: string; bytes?: number } | null>(null);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const send = useCallback(
    async (file: File) => {
      lastFileRef.current = file;
      setError("");
      setDone(false);
      setUploading(true);
      setProgress(0);
      setMeta({ name: file.name, bytes: file.size });

      // Show the file immediately rather than after the round trip. Documents
      // are private, so they get an icon instead of their contents.
      if (!privateFile && file.type.startsWith("image/")) {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = URL.createObjectURL(file);
        setPreview(objectUrlRef.current);
      }

      const body = new FormData();
      body.append("file", file);
      body.append("type", type);

      try {
        // XMLHttpRequest rather than fetch: it reports upload progress, which
        // is the whole point on a slow phone connection.
        const result = await new Promise<UploadedMedia>((resolve, reject) => {
          const request = new XMLHttpRequest();
          // Documents go to the private endpoint; everything else is public media.
          const endpoint = type === "document" || type === "certificate"
            ? "/api/uploads/verification-document"
            : "/api/uploads/image";
          request.open("POST", apiUrl(endpoint));
          request.withCredentials = true;
          request.upload.onprogress = (event) => {
            if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
          };
          request.onload = () => {
            try {
              const payload = JSON.parse(request.responseText || "{}");
              if (request.status >= 200 && request.status < 300 && payload.data?.url) resolve(payload.data);
              else reject(new Error(payload.error || `Upload failed (${request.status}).`));
            } catch {
              reject(new Error("The server returned an unexpected response."));
            }
          };
          request.onerror = () => reject(new Error("Network error while uploading. Check your connection and try again."));
          request.ontimeout = () => reject(new Error("The upload timed out. Try again on a stronger connection."));
          request.timeout = 120000;
          request.send(body);
        });

        setProgress(100);
        setDone(true);
        onUploaded(result.url, result);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
        setPreview("");
      } finally {
        setUploading(false);
      }
    },
    [onUploaded, privateFile, type]
  );

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file || disabled) return;
    send(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    pick(event.dataTransfer.files);
  }

  function clear() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = "";
    setPreview("");
    setMeta(null);
    setDone(false);
    setError("");
    setProgress(0);
    onCleared?.();
  }

  const shown = preview || (privateFile ? "" : value || "");
  const hasFile = Boolean(shown) || Boolean(value);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {requirement ? <span className="text-xs text-muted">{requirement}</span> : null}
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onKeyDown={(event) => {
          if (disabled || uploading) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`relative flex min-h-[9rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
          disabled
            ? "cursor-not-allowed border-line bg-sunken/50 opacity-60"
            : dragging
              ? "border-copper-600 bg-copper-600/5"
              : error
                ? "border-clay-600/60 bg-clay-600/5"
                : "border-line bg-sunken hover:border-copper-600/60"
        }`}
      >
        {hasFile && !uploading ? (
          <div className="flex w-full flex-col items-center gap-3">
            {shown ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shown} alt="" className={`${SHAPE[type]} rounded-xl object-cover`} />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface text-copper-600">
                {type === "gallery" ? <FileVideo className="h-6 w-6" /> : <Check className="h-6 w-6" />}
              </span>
            )}
            <div className="text-xs text-muted">
              {meta?.name ? <span className="font-semibold text-ink">{meta.name}</span> : <span className="font-semibold text-ink">File uploaded</span>}
              {meta?.bytes ? ` · ${readableSize(meta.bytes)}` : ""}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  inputRef.current?.click();
                }}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-ink transition-colors hover:bg-surface"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Replace
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  clear();
                }}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-clay-700 transition-colors hover:bg-surface"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          </div>
        ) : uploading ? (
          <div className="w-full max-w-xs">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-copper-600" />
            <p className="mt-3 text-sm font-semibold text-ink">Uploading{meta?.name ? ` ${meta.name}` : ""}…</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-copper-600 transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">{progress}%</p>
          </div>
        ) : (
          <>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-copper-600">
              {type === "gallery" ? <ImageUp className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
            </span>
            <p className="text-sm font-semibold text-ink">
              {disabled ? disabledMessage || "Unavailable" : "Drop a file here, or tap to choose"}
            </p>
            {helper ? <p className="max-w-sm text-xs leading-5 text-muted">{helper}</p> : null}
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT[type]}
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            pick(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {error ? (
        <div className="mt-2 flex items-start gap-2 text-xs leading-5 text-clay-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {error}{" "}
            {lastFileRef.current ? (
              <button type="button" onClick={() => lastFileRef.current && send(lastFileRef.current)} className="font-semibold underline underline-offset-2">
                Try again
              </button>
            ) : null}
          </span>
        </div>
      ) : null}

      {done && !error ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-moss-700">
          <Check className="h-3.5 w-3.5" /> Uploaded
        </p>
      ) : null}
    </div>
  );
}
