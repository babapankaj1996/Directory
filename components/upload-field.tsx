"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileVideo, ImageUp, Loader2 } from "lucide-react";
import { readApiJson } from "@/lib/api-response";
import { adminFetch, authFetch } from "@/lib/admin-auth";
import { getApiBase } from "@/lib/profiles";

type UploadFieldProps = {
  label: string;
  type: "cover" | "avatar" | "gallery" | "certificate" | "document";
  value?: string;
  admin?: boolean;
  onUploaded: (url: string, payload?: UploadedImage) => void;
  helper?: string;
  disabled?: boolean;
  disabledMessage?: string;
};

type UploadedImage = {
  url: string;
  webpUrl?: string;
  avifUrl?: string;
  mediaType?: "image" | "video";
  mimeType?: string;
  width?: number;
  height?: number;
  bytes?: number;
  storage?: string;
  originalName?: string;
};

export function UploadField({ label, type, value, admin = false, onUploaded, helper, disabled = false, disabledMessage }: UploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewFailed, setPreviewFailed] = useState(false);
  const [previewMediaType, setPreviewMediaType] = useState<"image" | "video">(() => mediaTypeFromUrl(value || ""));

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!previewUrl) setPreviewMediaType(mediaTypeFromUrl(value || ""));
  }, [previewUrl, value]);

  const preview = previewUrl || (type === "document" ? "" : value || "");
  const isVideoPreview = previewMediaType === "video" && type === "gallery";
  const accept = type === "gallery"
    ? "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
    : "image/jpeg,image/png,image/webp,image/avif";
  const previewShape = useMemo(() => {
    if (type === "avatar") return "aspect-square w-24";
    if (type === "cover") return "aspect-video w-full max-w-64";
    if (type === "gallery") return "aspect-[3/4] w-full max-w-48";
    return "aspect-[4/3] w-full max-w-48";
  }, [type]);

  function setLocalPreview(file: File) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
    setPreviewMediaType(file.type.startsWith("video/") ? "video" : "image");
    setPreviewFailed(false);
  }

  async function upload(file?: File) {
    if (!file) return;
    if (disabled) {
      setMessage(disabledMessage || "Upload is currently disabled.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setLocalPreview(file);
    setUploading(true);
    setMessage("");
    const form = new FormData();
    form.set("image", file);
    form.set("type", type);

    try {
      const uploadPath = type === "document" ? "/api/uploads/verification-document" : "/api/uploads/image";
      const response = await (admin ? adminFetch : authFetch)(`${getApiBase()}${uploadPath}`, {
        method: "POST",
        body: form
      });
      const payload = await readApiJson<{ data?: UploadedImage; error?: string }>(response, "upload");
      if (!response.ok || !payload.data?.url) throw new Error(payload.error || "Upload failed.");
      onUploaded(payload.data.url, payload.data);
      setPreviewMediaType(payload.data.mediaType === "video" ? "video" : "image");
      if (type !== "document" && objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = "";
      }
      if (type !== "document") setPreviewUrl(payload.data.url);
      setPreviewFailed(false);
      setMessage(type === "document"
        ? "Uploaded as a private admin-only verification document."
        : payload.data.mediaType === "video"
          ? "Uploaded video media for the profile gallery."
          : `Uploaded ${payload.data.width || ""}x${payload.data.height || ""} optimized WebP.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-champagne/50 bg-white/75 p-4">
      {preview && !previewFailed ? (
        <div className={`relative mb-4 overflow-hidden rounded-2xl bg-cloud shadow-sm ring-1 ring-slate-200 ${previewShape}`}>
          {isVideoPreview ? (
            <video
              src={preview}
              className="h-full w-full object-cover"
              controls
              muted
              playsInline
              preload="metadata"
              onError={() => setPreviewFailed(true)}
            />
          ) : (
            <img
              src={preview}
              alt={`${label} preview`}
              className="h-full w-full object-cover"
              onError={() => setPreviewFailed(true)}
            />
          )}
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink shadow-sm">
            {uploading ? "Uploading preview" : "Preview"}
          </span>
        </div>
      ) : (
        <div className={`mb-4 flex items-center justify-center rounded-2xl bg-cloud text-center ring-1 ring-slate-200 ${previewShape}`}>
          <div className="px-4">
            {type === "gallery" ? <FileVideo className="mx-auto h-7 w-7 text-champagne" /> : <ImageUp className="mx-auto h-7 w-7 text-champagne" />}
            <p className="mt-2 text-xs font-bold text-muted">{previewFailed ? "Preview unavailable" : type === "gallery" ? "No media selected" : "No image selected"}</p>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{label}</p>
          {helper ? <p className="mt-1 text-xs leading-5 text-muted">{helper}</p> : null}
          {value ? <p className="mt-1 truncate text-xs font-semibold text-muted">{value}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || disabled}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
          {uploading ? "Uploading" : disabled ? "Limit reached" : "Upload"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => upload(event.target.files?.[0])}
      />
      {disabled && disabledMessage ? <p className="mt-3 text-xs font-semibold text-amber-800">{disabledMessage}</p> : null}
      {message ? <p className="mt-3 text-xs font-semibold text-muted">{message}</p> : null}
    </div>
  );
}

function mediaTypeFromUrl(value: string): "image" | "video" {
  const clean = value.split("?")[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v|ogv)$/i.test(clean) ? "video" : "image";
}
