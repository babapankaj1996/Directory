"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Clock, FileWarning, Loader2, Lock, ShieldCheck, XCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/components/upload-dropzone";
import { readApiJson } from "@/lib/api-response";
import { apiUrl } from "@/lib/profiles";

/**
 * Identity verification, on its own page.
 *
 * It used to sit inside step 3 of the profile form, between the cover image and
 * the gallery, which mixed two very different things: public marketing material
 * an owner edits freely, and private identity documents reviewed once. Putting
 * them together made the profile form feel invasive and buried the one part
 * that actually gates publication.
 */
type Doc = { id: string; type: string; fileUrl?: string; status?: string; reviewNote?: string | null; createdAt?: string };

type Listing = {
  id: string;
  name?: string;
  isAdult?: boolean;
  verificationStatus?: string;
  verificationDocuments?: Doc[];
};

const REQUIRED = [
  {
    type: "GOV_ID",
    label: "Government photo ID",
    helper: "Passport, driving licence or national ID. The name and date of birth must be readable.",
    requirement: "JPG, PNG or PDF"
  },
  {
    type: "AGE_SELFIE",
    label: "Photo holding your date of birth",
    helper: "A recent photo of you holding a paper with today's date and your date of birth written on it.",
    requirement: "JPG or PNG"
  }
];

function statusTone(status?: string) {
  const value = (status || "").toUpperCase();
  if (value === "VERIFIED" || value === "APPROVED") return { icon: BadgeCheck, tone: "text-moss-700", label: "Verified" };
  if (value === "REJECTED") return { icon: XCircle, tone: "text-clay-700", label: "Needs attention" };
  if (value === "PENDING") return { icon: Clock, tone: "text-gold-700", label: "Under review" };
  return { icon: FileWarning, tone: "text-muted", label: "Not submitted" };
}

export function OwnerVerification() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const response = await fetch(apiUrl("/api/dashboard/listings"), { credentials: "include", cache: "no-store" });
      const payload = await readApiJson<{ data?: Listing[] }>(response, "listing");
      setListing((payload.data || [])[0] || null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load your listing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!listing) return;
    setSaving(true);
    setMessage("");
    try {
      // The API takes one document per call, so send them in sequence and stop
      // at the first failure rather than reporting a half-submitted set.
      for (const [type, fileUrl] of Object.entries(pending)) {
        const response = await fetch(apiUrl(`/api/dashboard/listings/${listing.id}/verification-documents`), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, fileUrl })
        });
        const payload = await readApiJson<{ error?: string }>(response, "verification");
        if (!response.ok) throw new Error(payload.error || "Could not submit those documents.");
      }
      setPending({});
      setMessage("Documents submitted. We will review them shortly.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit those documents.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-3 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your verification status…
      </p>
    );
  }

  if (!listing) {
    return (
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-ink">No listing yet</h2>
        <p className="mt-2 text-sm leading-7 text-muted">Create your listing first — verification applies to it once it exists.</p>
        <Button href="/dashboard/add-profile" variant="gold" size="sm" className="mt-4">Create a listing</Button>
      </GlassCard>
    );
  }

  if (!listing.isAdult) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-moss-700" />
          <div>
            <h2 className="text-lg font-semibold text-ink">No identity documents needed</h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-muted">
              Your category does not require identity verification. Your listing is reviewed on its content alone, and
              you never need to send us a document.
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  const state = statusTone(listing.verificationStatus);
  const StateIcon = state.icon;
  const existing = new Map((listing.verificationDocuments || []).map((doc) => [doc.type, doc]));
  const readyToSubmit = Object.keys(pending).length > 0;

  return (
    <div className="grid gap-5">
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StateIcon className={`h-6 w-6 ${state.tone}`} />
            <div>
              <p className="text-2xs font-bold uppercase tracking-[0.14em] text-muted">Verification status</p>
              <p className={`text-lg font-semibold ${state.tone}`}>{state.label}</p>
            </div>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted">
            Your category is age-restricted, so we confirm identity and age before the listing can be published.
          </p>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-start gap-3 rounded-xl border border-line bg-sunken p-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-copper-600" />
          <p className="text-sm leading-6 text-muted">
            These files go to private storage that is not served from any public address. Only a reviewer can open them,
            they never appear on your public profile, and they are removed with your account if you close it.
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {REQUIRED.map((requirement) => {
            const doc = existing.get(requirement.type);
            const docState = statusTone(doc?.status);
            return (
              <div key={requirement.type}>
                <UploadDropzone
                  label={requirement.label}
                  type="document"
                  privateFile
                  requirement={requirement.requirement}
                  helper={requirement.helper}
                  value={pending[requirement.type] || (doc?.fileUrl ? "submitted" : "")}
                  onUploaded={(url) => setPending((current) => ({ ...current, [requirement.type]: url }))}
                  onCleared={() =>
                    setPending((current) => {
                      const next = { ...current };
                      delete next[requirement.type];
                      return next;
                    })
                  }
                />
                {doc ? (
                  <p className={`mt-2 text-xs font-semibold ${docState.tone}`}>
                    On file · {docState.label}
                    {doc.reviewNote ? <span className="block font-normal text-muted">{doc.reviewNote}</span> : null}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button type="button" variant="gold" disabled={!readyToSubmit || saving} onClick={submit}>
            {saving ? "Submitting…" : "Submit for verification"}
          </Button>
          {message ? <p className="text-sm font-semibold text-ink">{message}</p> : null}
          {!readyToSubmit && !message ? <p className="text-sm text-muted">Upload a document to submit.</p> : null}
        </div>
      </GlassCard>
    </div>
  );
}
