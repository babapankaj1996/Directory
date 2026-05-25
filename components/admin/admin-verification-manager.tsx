"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, FileText, Search, ShieldCheck, XCircle } from "lucide-react";
import { AdminSectionHeader, StatusPill } from "@/components/admin/admin-ui";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-auth";
import { getApiBase, normalizeProfile } from "@/lib/profiles";
import type { Listing } from "@/lib/data";
import { effectiveVerificationStatus as resolveEffectiveVerificationStatus } from "@/lib/verification-status";

type VerificationDocument = {
  id: string;
  profileId: string;
  type: string;
  fileUrl: string;
  originalName?: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED" | string;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  profile?: unknown;
};

type VerificationGroup = {
  id: string;
  profile?: Listing;
  documents: VerificationDocument[];
};

const filters = ["PENDING", "VERIFIED", "REJECTED", "ALL"] as const;

function statusTone(status: string): "green" | "amber" | "red" | "gray" {
  if (status === "VERIFIED") return "green";
  if (status === "REJECTED") return "red";
  if (status === "PENDING") return "amber";
  return "gray";
}

function documentLabel(type?: string) {
  const labels: Record<string, string> = {
    GOV_ID: "Government ID",
    AGE_SELFIE: "DOB selfie/photo",
    BUSINESS_LICENSE: "Business license",
    CERTIFICATE: "Certificate",
    ADDRESS_PROOF: "Address proof",
    OTHER: "Other document"
  };
  return labels[String(type || "OTHER").toUpperCase()] || "Verification document";
}

function profileHref(profile: Listing) {
  return `/${profile.country}/${profile.city}/${profile.categorySlug}/${profile.slug}`;
}

function normalizeDocumentStatus(status?: string | null) {
  return String(status || "PENDING").trim().toUpperCase();
}

function groupVerificationStatus(group: VerificationGroup) {
  if (group.documents.some((document) => normalizeDocumentStatus(document.status) === "REJECTED")) return "REJECTED";
  return resolveEffectiveVerificationStatus({
    profileStatus: group.profile?.verificationStatus,
    documents: group.documents,
    isAdult: group.profile?.isAdult
  });
}

function groupProgress(group: VerificationGroup) {
  return {
    total: group.documents.length,
    pending: group.documents.filter((document) => normalizeDocumentStatus(document.status) === "PENDING").length,
    verified: group.documents.filter((document) => normalizeDocumentStatus(document.status) === "VERIFIED").length,
    rejected: group.documents.filter((document) => normalizeDocumentStatus(document.status) === "REJECTED").length
  };
}

export function AdminVerificationManager() {
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>("PENDING");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [groupNotes, setGroupNotes] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());

    const timer = window.setTimeout(() => {
      adminFetch(`${getApiBase()}/api/admin/listings/verification-documents?${params.toString()}`)
        .then((response) => response.ok ? response.json() : undefined)
        .then((payload: { data?: VerificationDocument[] } | undefined) => {
          if (!mounted) return;
          const rows = Array.isArray(payload?.data) ? payload.data : [];
          setDocuments(rows);
          setNotes(rows.reduce<Record<string, string>>((current, document) => {
            current[document.id] = document.adminNotes || "";
            return current;
          }, {}));
          setGroupNotes(rows.reduce<Record<string, string>>((current, document) => {
            const groupId = document.profileId || document.id;
            if (!current[groupId] && document.adminNotes) current[groupId] = document.adminNotes;
            return current;
          }, {}));
        })
        .catch(() => {
          if (mounted) setNotice("Could not load verification documents.");
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }, search.trim() ? 250 : 0);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [search]);

  const stats = useMemo(() => ({
    total: documents.length,
    pending: documents.filter((document) => normalizeDocumentStatus(document.status) === "PENDING").length,
    verified: documents.filter((document) => normalizeDocumentStatus(document.status) === "VERIFIED").length,
    rejected: documents.filter((document) => normalizeDocumentStatus(document.status) === "REJECTED").length
  }), [documents]);

  const groups = useMemo<VerificationGroup[]>(() => {
    const byProfile = new Map<string, VerificationGroup>();
    documents.forEach((document) => {
      const profile = document.profile ? normalizeProfile(document.profile) : undefined;
      const id = document.profileId || profile?.id || profile?.slug || document.id;
      const group = byProfile.get(id) || { id, profile, documents: [] };
      if (!group.profile && profile) group.profile = profile;
      group.documents.push(document);
      byProfile.set(id, group);
    });

    return [...byProfile.values()]
      .map((group) => ({
        ...group,
        documents: [...group.documents].sort((a, b) => {
          const statusOrder = { PENDING: 0, REJECTED: 1, VERIFIED: 2 } as Record<string, number>;
          return (statusOrder[normalizeDocumentStatus(a.status)] ?? 9) - (statusOrder[normalizeDocumentStatus(b.status)] ?? 9)
            || String(a.type).localeCompare(String(b.type))
            || new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        })
      }))
      .sort((a, b) => groupProgress(b).pending - groupProgress(a).pending || (a.profile?.name || "").localeCompare(b.profile?.name || ""));
  }, [documents]);

  const visibleGroups = useMemo(() => {
    if (filter === "ALL") return groups;
    return groups.filter((group) => groupVerificationStatus(group) === filter);
  }, [filter, groups]);

  function mergeUpdatedDocument(updatedDocument: VerificationDocument) {
    setDocuments((current) => current.map((item) => {
      if (item.id === updatedDocument.id) return updatedDocument;
      if (item.profileId === updatedDocument.profileId && updatedDocument.profile) return { ...item, profile: updatedDocument.profile };
      return item;
    }));
  }

  async function updateStatus(document: VerificationDocument, status: "PENDING" | "VERIFIED" | "REJECTED") {
    const adminNotes = notes[document.id] || "";
    if (status === "REJECTED" && !adminNotes.trim()) {
      setNotice("Add an owner-visible comment before rejecting a document.");
      return;
    }

    setNotice("");
    setBusyId(document.id);
    setDocuments((current) => current.map((item) => item.id === document.id ? { ...item, status, adminNotes } : item));

    const response = await adminFetch(`${getApiBase()}/api/admin/listings/verification-documents/${document.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNotes })
    }).catch(() => undefined);

    if (!response?.ok) {
      setDocuments((current) => current.map((item) => item.id === document.id ? document : item));
      setNotice("Document status could not be updated.");
      setBusyId("");
      return;
    }

    const payload = await response.json() as { data?: VerificationDocument };
    if (payload.data) {
      mergeUpdatedDocument(payload.data);
      setNotice(status === "VERIFIED" ? "Document approved." : status === "REJECTED" ? "Document rejected with owner-visible comment." : "Document kept pending.");
    }
    setBusyId("");
  }

  async function updateGroupStatus(group: VerificationGroup, status: "VERIFIED" | "REJECTED") {
    const adminNotes = groupNotes[group.id] || "";
    if (status === "REJECTED" && !adminNotes.trim()) {
      setNotice("Add one owner-visible rejection comment for this profile before rejecting documents.");
      return;
    }

    const targets = group.documents.filter((document) => normalizeDocumentStatus(document.status) !== status);
    if (!targets.length) {
      setNotice(status === "VERIFIED" ? "All documents are already approved." : "All documents are already rejected.");
      return;
    }

    const previousDocuments = documents;
    setNotice("");
    setBusyId(`group-${group.id}`);
    setDocuments((current) => current.map((item) => {
      if (!targets.some((document) => document.id === item.id)) return item;
      return { ...item, status, adminNotes: status === "REJECTED" ? adminNotes : item.adminNotes };
    }));
    if (status === "REJECTED") {
      setNotes((current) => targets.reduce<Record<string, string>>((next, document) => {
        next[document.id] = adminNotes;
        return next;
      }, { ...current }));
    }

    try {
      const results = await Promise.all(targets.map(async (document) => {
        const response = await adminFetch(`${getApiBase()}/api/admin/listings/verification-documents/${document.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, adminNotes: status === "REJECTED" ? adminNotes : notes[document.id] || "" })
        });
        if (!response.ok) throw new Error("Document status could not be updated.");
        const payload = await response.json() as { data?: VerificationDocument };
        return payload.data;
      }));
      results.filter(Boolean).forEach((document) => mergeUpdatedDocument(document as VerificationDocument));
      setNotice(status === "VERIFIED" ? "All profile documents approved." : "All profile documents rejected with owner-visible comment.");
    } catch {
      setDocuments(previousDocuments);
      setNotice("Profile document statuses could not be updated.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      <AdminSectionHeader
        eyebrow="Document verification"
        title="Verify uploaded documents"
        description="Each business is grouped into one review card. Listing approval and document verification remain separate."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <VerificationStat label="Documents" value={stats.total} icon={<FileText className="h-5 w-5" />} />
        <VerificationStat label="Pending" value={stats.pending} icon={<Clock3 className="h-5 w-5" />} />
        <VerificationStat label="Verified" value={stats.verified} icon={<CheckCircle2 className="h-5 w-5" />} />
        <VerificationStat label="Rejected" value={stats.rejected} icon={<XCircle className="h-5 w-5" />} />
      </div>

      <GlassCard className="my-6">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search business, owner, city, category, document type or comment"
              className="w-full rounded-2xl border border-white/80 bg-white/75 py-3 pl-11 pr-4 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${filter === item ? "bg-ink text-white shadow-glass" : "bg-white/70 text-muted hover:bg-white hover:text-ink"}`}
              >
                {item === "ALL" ? "All" : item.charAt(0) + item.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        {notice ? <p className="mt-4 rounded-2xl bg-white/65 px-4 py-3 text-sm font-semibold text-muted">{notice}</p> : null}
      </GlassCard>

      <div className="grid gap-5">
        {visibleGroups.map((group) => {
          const profile = group.profile;
          const progress = groupProgress(group);
          const verificationStatus = groupVerificationStatus(group);
          const groupBusy = busyId === `group-${group.id}`;
          return (
            <GlassCard key={group.id} className="overflow-hidden p-0">
              <div className="border-b border-white/70 bg-white/50 p-4 sm:p-5">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={statusTone(verificationStatus)}>{verificationStatus.toLowerCase()}</StatusPill>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-muted ring-1 ring-slate-200">
                        {progress.total} document{progress.total === 1 ? "" : "s"}
                      </span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-100">{progress.pending} pending</span>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">{progress.verified} verified</span>
                      <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-100">{progress.rejected} rejected</span>
                    </div>
                    <h2 className="mt-3 break-words text-2xl font-semibold text-ink">{profile?.name || "Listing document group"}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {profile ? `${profile.category} in ${profile.cityName}` : "Profile details unavailable"}
                    </p>
                    {profile ? (
                      <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2 xl:grid-cols-4">
                        <Info label="Owner" value={profile.ownerName} />
                        <Info label="Email" value={profile.ownerEmail || profile.email || "-"} />
                        <Info label="Phone" value={profile.phone || "-"} />
                        <Info label="Listing status" value={profile.status} />
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {profile ? <Button href={`/admin/listings/${profile.slug}#documents`} variant="ghost" className="px-4 py-2.5">Open Listing Review</Button> : null}
                      {profile && profile.status === "approved" ? <Button href={profileHref(profile)} variant="ghost" className="px-4 py-2.5">Public Profile</Button> : null}
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] bg-white/80 p-4 ring-1 ring-slate-200">
                    <label>
                      <span className="mb-2 block text-sm font-semibold text-ink">Shared rejection comment</span>
                      <textarea
                        value={groupNotes[group.id] || ""}
                        onChange={(event) => setGroupNotes((current) => ({ ...current, [group.id]: event.target.value }))}
                        rows={3}
                        placeholder="Example: Government ID is unreadable. Please upload a clearer document."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/75 focus:border-champagne focus:ring-4 focus:ring-amber-100"
                      />
                    </label>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                      <Button
                        variant="gold"
                        disabled={groupBusy || progress.verified === progress.total}
                        onClick={() => updateGroupStatus(group, "VERIFIED")}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Approve all documents
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={groupBusy || progress.rejected === progress.total}
                        onClick={() => updateGroupStatus(group, "REJECTED")}
                        className="bg-rose-50 text-rose-700 ring-rose-100 hover:bg-rose-100"
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Reject all documents
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="overflow-hidden rounded-[1.25rem] bg-white/80 ring-1 ring-slate-200">
                  <div className="hidden grid-cols-[116px_minmax(0,1fr)_minmax(230px,280px)_180px] gap-4 bg-cloud/70 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-muted xl:grid">
                    <span>Preview</span>
                    <span>Document</span>
                    <span>Owner comment</span>
                    <span>Action</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                {group.documents.map((document) => {
                  const updated = new Date(document.updatedAt || document.createdAt);
                  const busy = busyId === document.id || groupBusy;
                  const documentStatus = normalizeDocumentStatus(document.status);
                  return (
                    <div key={document.id} className="grid gap-4 p-4 xl:grid-cols-[116px_minmax(0,1fr)_minmax(230px,280px)_180px] xl:items-start">
                        <PrivateDocumentPreview fileUrl={document.fileUrl} compact />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill tone={statusTone(documentStatus)}>{documentStatus.toLowerCase()}</StatusPill>
                            <span className="rounded-full bg-cloud px-3 py-1 text-xs font-bold text-muted">{documentLabel(document.type)}</span>
                            <span className="text-xs font-semibold text-muted">{Number.isNaN(updated.getTime()) ? "" : updated.toLocaleDateString()}</span>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-ink">{document.originalName || "Private verification document"}</p>
                          <p className="mt-2 break-all text-xs font-semibold text-muted">{document.fileUrl}</p>
                        </div>
                        <div className="min-w-0">
                          <label>
                            <span className="mb-2 block text-sm font-semibold text-ink xl:hidden">Owner-visible comment</span>
                            <textarea
                              value={notes[document.id] || ""}
                              onChange={(event) => setNotes((current) => ({ ...current, [document.id]: event.target.value }))}
                              rows={3}
                              placeholder="Example: DOB is not readable. Please upload a clearer photo."
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-muted/75 focus:border-champagne focus:ring-4 focus:ring-amber-100"
                            />
                          </label>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                            <Button
                              variant={documentStatus === "VERIFIED" ? "ghost" : "gold"}
                              className="px-4 py-2.5"
                              disabled={busy || documentStatus === "VERIFIED"}
                              onClick={() => updateStatus(document, "VERIFIED")}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" /> {documentStatus === "VERIFIED" ? "Approved" : "Approve"}
                            </Button>
                            <Button variant="ghost" className="px-4 py-2.5" disabled={busy || documentStatus === "PENDING"} onClick={() => updateStatus(document, "PENDING")}><Clock3 className="mr-2 h-4 w-4" /> Pending</Button>
                            <Button variant="ghost" className="bg-rose-50 px-4 py-2.5 text-rose-700 ring-rose-100 hover:bg-rose-100" disabled={busy || documentStatus === "REJECTED"} onClick={() => updateStatus(document, "REJECTED")}><XCircle className="mr-2 h-4 w-4" /> {documentStatus === "REJECTED" ? "Rejected" : "Reject"}</Button>
                        </div>
                    </div>
                  );
                })}
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}

        {!loading && visibleGroups.length === 0 ? (
          <GlassCard>
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-champagne shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-ink">No verification documents found</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Try another filter or search term. Owner uploads appear here grouped by business.</p>
              </div>
            </div>
          </GlassCard>
        ) : null}
        {loading ? <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-muted ring-1 ring-slate-200">Loading verification documents...</p> : null}
      </div>
    </div>
  );
}

function VerificationStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-champagne shadow-sm">{icon}</span>
      </div>
    </GlassCard>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/65 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 break-words font-semibold text-ink">{value}</p>
    </div>
  );
}

function privateDocumentUrl(fileUrl: string) {
  if (fileUrl.startsWith("http")) return fileUrl;
  return `${getApiBase().replace(/\/$/, "")}${fileUrl}`;
}

function PrivateDocumentPreview({ fileUrl, compact = false }: { fileUrl: string; compact?: boolean }) {
  const [objectUrl, setObjectUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const previewHeight = compact ? "min-h-24" : "min-h-32";
  const imageHeight = compact ? "h-24" : "max-h-40";

  useEffect(() => {
    let mounted = true;
    let localObjectUrl = "";
    setObjectUrl("");
    setFailed(false);
    adminFetch(privateDocumentUrl(fileUrl))
      .then((response) => response.ok ? response.blob() : undefined)
      .then((blob) => {
        if (!mounted || !blob) {
          if (mounted) setFailed(true);
          return;
        }
        const nextUrl = URL.createObjectURL(blob);
        localObjectUrl = nextUrl;
        setObjectUrl(nextUrl);
      })
      .catch(() => {
        if (mounted) setFailed(true);
      });
    return () => {
      mounted = false;
      if (localObjectUrl) URL.revokeObjectURL(localObjectUrl);
    };
  }, [fileUrl]);

  if (failed) {
    return (
      <div className={`flex ${previewHeight} items-center justify-center rounded-[1.1rem] bg-rose-50 p-4 text-center text-xs font-semibold text-rose-700 ring-1 ring-rose-100`}>
        Preview unavailable.
      </div>
    );
  }
  if (!objectUrl) return <div className={`${previewHeight} animate-pulse rounded-[1.1rem] bg-white ring-1 ring-slate-200`} />;
  return <img src={objectUrl} alt="Private verification document" className={`${imageHeight} w-full rounded-[1.1rem] bg-white object-contain ring-1 ring-slate-200`} />;
}
