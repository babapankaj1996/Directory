"use client";

import { MouseEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { authFetch, clearAdminSession } from "@/lib/admin-auth";
import { apiUrl, getApiBase } from "@/lib/profiles";

export function SaveProfileButton({
  profileId,
  className = "",
  savedClassName = "",
  label = "Save profile",
  showLabel = false
}: {
  profileId: string;
  className?: string;
  savedClassName?: string;
  label?: string;
  showLabel?: boolean;
}) {
  const pathname = usePathname();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!profileId) return;

    let mounted = true;
    authFetch(apiUrl(`/api/dashboard/saved-profiles/${profileId}/status`))
      .then((response) => response.ok ? response.json() : undefined)
      .then((payload: { data?: { authenticated?: boolean; saved?: boolean } } | undefined) => {
        if (!mounted) return;
        setSaved(Boolean(payload?.data?.saved));
        setHasSession(Boolean(payload?.data?.authenticated));
        if (payload?.data?.authenticated === false) {
          clearAdminSession();
          setHasSession(false);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [profileId]);

  async function toggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!profileId || loading) return;
    if (!hasSession) {
      window.location.href = `/login?next=${encodeURIComponent(pathname || "/")}`;
      return;
    }

    const nextSaved = !saved;
    setSaved(nextSaved);
    setLoading(true);
    const response = await authFetch(apiUrl(`/api/dashboard/saved-profiles/${profileId}`), {
      method: nextSaved ? "POST" : "DELETE"
    }).catch(() => undefined);
    if (!response?.ok) setSaved(!nextSaved);
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-pressed={saved}
      aria-label={saved ? "Remove saved profile" : label}
      title={saved ? "Saved profile" : label}
      className={`${className} ${saved ? savedClassName : ""}`}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Heart className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />}
      {showLabel ? <span>{saved ? "Saved" : "Save"}</span> : null}
    </button>
  );
}
