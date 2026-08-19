"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, Eye, EyeOff, RotateCcw, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { readApiJson } from "@/lib/api-response";
import { apiUrl } from "@/lib/profiles";

/**
 * The controls an owner has over a listing that is already live: see whether a
 * change is waiting for review, take the listing off the directory temporarily,
 * and ask for the account to be removed.
 *
 * Each one states what actually happens, because the consequences differ
 * sharply — pausing is instantly reversible, deletion is not reversible at all.
 */
type PendingRevision = { id: string; submittedAt: string } | null;
type DeletionRequest = { id: string; requestedAt: string } | null;

export function OwnerListingControls({
  profileId,
  isPaused,
  status
}: {
  profileId: string;
  isPaused: boolean;
  status: string;
}) {
  const router = useRouter();
  const [revision, setRevision] = useState<PendingRevision>(null);
  const [deletion, setDeletion] = useState<DeletionRequest>(null);
  const [paused, setPaused] = useState(isPaused);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      const [revResponse, delResponse] = await Promise.all([
        fetch(apiUrl(`/api/dashboard/listings/${profileId}/revision`), { credentials: "include", cache: "no-store" }),
        fetch(apiUrl("/api/dashboard/account/deletion-request"), { credentials: "include", cache: "no-store" })
      ]);
      const rev = await readApiJson<{ data?: PendingRevision }>(revResponse, "pending changes");
      const del = await readApiJson<{ data?: DeletionRequest }>(delResponse, "deletion request");
      setRevision(rev.data ?? null);
      setDeletion(del.data ?? null);
    } catch {
      // A control panel that cannot read its own state should stay quiet rather
      // than shout; the actions below still report their own failures.
    }
  }, [profileId]);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePause() {
    setBusy("pause");
    setMessage("");
    try {
      const response = await fetch(apiUrl(`/api/dashboard/listings/${profileId}/pause`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: !paused })
      });
      const payload = await readApiJson<{ message?: string; error?: string }>(response, "pause");
      if (!response.ok) throw new Error(payload.error || "Could not change that.");
      setPaused((value) => !value);
      setMessage(payload.message || "Saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not change that.");
    } finally {
      setBusy("");
    }
  }

  async function withdrawChanges() {
    setBusy("withdraw");
    setMessage("");
    try {
      const response = await fetch(apiUrl(`/api/dashboard/listings/${profileId}/revision`), {
        method: "DELETE",
        credentials: "include"
      });
      const payload = await readApiJson<{ message?: string; error?: string }>(response, "withdraw");
      if (!response.ok) throw new Error(payload.error || "Could not withdraw those changes.");
      setRevision(null);
      setMessage(payload.message || "Withdrawn.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not withdraw those changes.");
    } finally {
      setBusy("");
    }
  }

  async function requestDeletion() {
    setBusy("delete");
    setMessage("");
    try {
      const response = await fetch(apiUrl("/api/dashboard/account/deletion-request"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      const payload = await readApiJson<{ data?: DeletionRequest; message?: string; error?: string }>(response, "deletion request");
      if (!response.ok) throw new Error(payload.error || "Could not send that request.");
      setDeletion(payload.data ?? null);
      setConfirmingDelete(false);
      setMessage(payload.message || "Request sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send that request.");
    } finally {
      setBusy("");
    }
  }

  async function cancelDeletion() {
    setBusy("cancel");
    try {
      await fetch(apiUrl("/api/dashboard/account/deletion-request"), { method: "DELETE", credentials: "include" });
      setDeletion(null);
      setMessage("Your deletion request was cancelled.");
    } finally {
      setBusy("");
    }
  }

  const isLive = status === "APPROVED";

  return (
    <div className="grid gap-4">
      {message ? <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink">{message}</p> : null}

      {revision ? (
        <GlassCard className="p-5">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" />
            <div className="flex-1">
              <h3 className="font-semibold text-ink">Your changes are waiting for review</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted">
                Submitted {new Date(revision.submittedAt).toLocaleString()}. Your listing is still live with its current
                details — visitors see no interruption. The new version replaces it once approved.
              </p>
              <Button type="button" variant="ghost" size="sm" className="mt-3" disabled={busy === "withdraw"} onClick={withdrawChanges}>
                <RotateCcw className="mr-1.5 h-4 w-4" /> Withdraw these changes
              </Button>
            </div>
          </div>
        </GlassCard>
      ) : null}

      {isLive ? (
        <GlassCard className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {paused ? <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-clay-600" /> : <Eye className="mt-0.5 h-5 w-5 shrink-0 text-moss-700" />}
              <div>
                <h3 className="font-semibold text-ink">{paused ? "Your listing is paused" : "Your listing is visible"}</h3>
                <p className="mt-1.5 max-w-md text-sm leading-6 text-muted">
                  {paused
                    ? "It is hidden from search and cannot be opened by a direct link. Resume whenever you like — it goes back exactly as it was, with no new review."
                    : "Pausing hides it from the directory without deleting anything. Useful if you are fully booked or away. You can bring it back instantly."}
                </p>
              </div>
            </div>
            <Button type="button" variant={paused ? "gold" : "ghost"} size="sm" disabled={busy === "pause"} onClick={togglePause}>
              {busy === "pause" ? "Saving…" : paused ? "Resume listing" : "Pause listing"}
            </Button>
          </div>
        </GlassCard>
      ) : null}

      <GlassCard className="p-5">
        {deletion ? (
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-clay-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-ink">Deletion requested</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted">
                Sent {new Date(deletion.requestedAt).toLocaleString()}. Your account stays active until it is actioned,
                and you can change your mind until then.
              </p>
              <Button type="button" variant="ghost" size="sm" className="mt-3" disabled={busy === "cancel"} onClick={cancelDeletion}>
                Cancel this request
              </Button>
            </div>
          </div>
        ) : confirmingDelete ? (
          <div>
            <h3 className="font-semibold text-ink">Delete your account</h3>
            <p className="mt-1.5 text-sm leading-6 text-muted">
              This removes your account, your listing, its reviews, enquiries and uploaded media. It cannot be undone.
              A member of the team reviews the request first, so nothing disappears immediately.
            </p>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Anything you would like us to know? (optional)"
              className="mt-3 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm leading-6 text-ink outline-none focus:border-copper-600"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="gold" size="sm" disabled={busy === "delete"} onClick={requestDeletion}>
                {busy === "delete" ? "Sending…" : "Send deletion request"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>Keep my account</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
              <div>
                <h3 className="font-semibold text-ink">Delete your account</h3>
                <p className="mt-1.5 max-w-md text-sm leading-6 text-muted">
                  Removes your account and everything attached to it. If you only want a break, pause the listing
                  instead — it keeps your reviews and ratings.
                </p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>Request deletion</Button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
