"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Clock, FileDiff, Loader2, Trash2, X } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { readApiJson } from "@/lib/api-response";
import { apiUrl } from "@/lib/profiles";

/**
 * The two review queues that hold something back from taking effect: changes an
 * owner has proposed to a listing that is already live, and requests to delete
 * an account outright.
 *
 * Both are shown with the consequence spelled out, because the two decisions
 * are asymmetric — approving a change is reversible by editing, approving a
 * deletion is not reversible at all.
 */
type Change = { field: string; from: unknown; to: unknown };

type Revision = {
  id: string;
  profileId: string;
  submittedAt: string;
  changes: Change[];
  profile?: { name?: string; slug?: string; city?: { name?: string }; category?: { name?: string } };
};

type DeletionRequest = {
  id: string;
  reason?: string | null;
  requestedAt: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
    createdAt?: string;
    profiles?: { id: string; name: string; slug: string; status: string }[];
  };
};

const FIELD_LABELS: Record<string, string> = {
  name: "Business name",
  ownerName: "Owner name",
  description: "Description",
  shortDescription: "Summary",
  phone: "Phone",
  whatsapp: "WhatsApp",
  website: "Website",
  address: "Address",
  coverImage: "Cover image",
  avatarImage: "Profile picture",
  seoTitle: "SEO title",
  seoDescription: "SEO description",
  services: "Services",
  pricing: "Pricing",
  businessHours: "Opening hours"
};

/** Values arrive as anything JSON can hold; render them so a reviewer can read them. */
function present(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function whenever(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function AdminChangeReview() {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [deletions, setDeletions] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>("");
  const [status, setStatus] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [revResponse, delResponse] = await Promise.all([
        fetch(apiUrl("/api/admin/listings/revisions"), { credentials: "include", cache: "no-store" }),
        fetch(apiUrl("/api/admin/listings/deletion-requests"), { credentials: "include", cache: "no-store" })
      ]);
      const revPayload = await readApiJson<{ data?: Revision[] }>(revResponse, "changes");
      const delPayload = await readApiJson<{ data?: DeletionRequest[] }>(delResponse, "deletion requests");
      setRevisions(revPayload.data || []);
      setDeletions(delPayload.data || []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load the review queues.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decideRevision(id: string, decision: "APPROVE" | "REJECT") {
    setBusy(id);
    setStatus("");
    try {
      const response = await fetch(apiUrl(`/api/admin/listings/revisions/${id}`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision })
      });
      const payload = await readApiJson<{ message?: string; error?: string }>(response, "change review");
      if (!response.ok) throw new Error(payload.error || "Could not save that decision.");
      setStatus(payload.message || "Saved.");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save that decision.");
    } finally {
      setBusy("");
    }
  }

  async function decideDeletion(id: string, decision: "APPROVE" | "REJECT") {
    setBusy(id);
    setStatus("");
    try {
      const response = await fetch(apiUrl(`/api/admin/listings/deletion-requests/${id}`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision })
      });
      const payload = await readApiJson<{ message?: string; error?: string }>(response, "deletion request");
      if (!response.ok) throw new Error(payload.error || "Could not save that decision.");
      setStatus(payload.message || "Saved.");
      setConfirmDelete("");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save that decision.");
    } finally {
      setBusy("");
    }
  }

  const totals = useMemo(() => ({ changes: revisions.length, deletions: deletions.length }), [revisions, deletions]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-8 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the review queues…
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      {status ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink">{status}</p>
      ) : null}

      <section>
        <div className="mb-4 flex items-center gap-3">
          <FileDiff className="h-5 w-5 text-copper-600" />
          <h2 className="text-xl font-semibold text-ink">
            Proposed changes {totals.changes ? <span className="text-copper-600">({totals.changes})</span> : null}
          </h2>
        </div>
        <p className="mb-5 max-w-2xl text-sm leading-7 text-muted">
          These listings are live and stay exactly as they are until you accept a change. Rejecting leaves the current
          version in place; the owner keeps their listing either way.
        </p>

        {!revisions.length ? (
          <GlassCard className="p-6 text-sm text-muted">No changes waiting for review.</GlassCard>
        ) : (
          <div className="grid gap-4">
            {revisions.map((revision) => (
              <GlassCard key={revision.id} className="p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{revision.profile?.name || "Listing"}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {[revision.profile?.category?.name, revision.profile?.city?.name].filter(Boolean).join(" · ")}
                      {revision.profile?.city?.name ? " · " : ""}
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {whenever(revision.submittedAt)}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="gold" size="sm" disabled={busy === revision.id} onClick={() => decideRevision(revision.id, "APPROVE")}>
                      <Check className="mr-1.5 h-4 w-4" /> Apply to live listing
                    </Button>
                    <Button type="button" variant="ghost" size="sm" disabled={busy === revision.id} onClick={() => decideRevision(revision.id, "REJECT")}>
                      <X className="mr-1.5 h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[34rem] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-2xs font-bold uppercase tracking-[0.14em] text-muted">
                        <th className="py-2 pr-4">Field</th>
                        <th className="py-2 pr-4">Currently live</th>
                        <th className="py-2">Proposed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revision.changes.map((change) => (
                        <tr key={change.field} className="border-b border-line/60 align-top">
                          <td className="py-3 pr-4 font-semibold text-ink">{FIELD_LABELS[change.field] || change.field}</td>
                          <td className="py-3 pr-4 text-muted">{present(change.from)}</td>
                          <td className="py-3 font-medium text-ink">{present(change.to)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <Trash2 className="h-5 w-5 text-clay-600" />
          <h2 className="text-xl font-semibold text-ink">
            Account deletion requests {totals.deletions ? <span className="text-clay-600">({totals.deletions})</span> : null}
          </h2>
        </div>

        {!deletions.length ? (
          <GlassCard className="p-6 text-sm text-muted">No deletion requests.</GlassCard>
        ) : (
          <div className="grid gap-4">
            {deletions.map((request) => (
              <GlassCard key={request.id} className="p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{request.user?.name || "Account"}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {request.user?.email} · requested {whenever(request.requestedAt)}
                    </p>
                    {request.reason ? <p className="mt-3 max-w-xl text-sm leading-6 text-muted">“{request.reason}”</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {confirmDelete === request.id ? (
                      <>
                        <Button type="button" variant="gold" size="sm" disabled={busy === request.id} onClick={() => decideDeletion(request.id, "APPROVE")}>
                          {busy === request.id ? "Deleting…" : "Yes, delete permanently"}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete("")}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(request.id)}>
                          <Trash2 className="mr-1.5 h-4 w-4" /> Delete account
                        </Button>
                        <Button type="button" variant="ghost" size="sm" disabled={busy === request.id} onClick={() => decideDeletion(request.id, "REJECT")}>
                          Decline
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-3 rounded-xl border border-clay-600/30 bg-clay-600/5 p-4">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-clay-600" />
                  <div className="text-sm leading-6 text-muted">
                    Deleting removes the account and everything attached to it — listings, reviews, enquiries and
                    uploaded media. It cannot be undone.
                    {request.user?.profiles?.length ? (
                      <ul className="mt-2 grid gap-1">
                        {request.user.profiles.map((profile) => (
                          <li key={profile.id} className="text-ink">
                            · {profile.name} <span className="text-muted">({profile.status.toLowerCase()})</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-ink">No listings attached to this account.</p>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
