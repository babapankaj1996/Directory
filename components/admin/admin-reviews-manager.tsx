"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Search, Trash2, XCircle } from "lucide-react";
import { AdminSectionHeader, StatusPill } from "@/components/admin/admin-ui";
import { GlassCard } from "@/components/ui/glass-card";
import { adminFetch } from "@/lib/admin-auth";
import { apiUrl, getApiBase } from "@/lib/profiles";

type Review = {
  id: string;
  rating: number;
  title?: string;
  comment: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  moderationNote?: string;
  createdAt: string;
  user?: { name?: string; email?: string };
  profile?: { name?: string; slug?: string; countryId?: string; categoryId?: string; city?: { slug?: string; name?: string } };
};

const filters = ["ALL", "PENDING", "APPROVED", "REJECTED"];

function tone(status: string) {
  if (status === "APPROVED") return "green";
  if (status === "REJECTED") return "red";
  return "amber";
}

export function AdminReviewsManager() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    adminFetch(apiUrl(`/api/admin/reviews`))
      .then((response) => response.ok ? response.json() : undefined)
      .then((payload: { data?: Review[] } | undefined) => {
        if (mounted && Array.isArray(payload?.data)) setReviews(payload.data);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const visible = useMemo(() => {
    const tokens = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return reviews.filter((review) => {
      const statusMatch = filter === "ALL" || review.status === filter;
      const text = [
        review.title,
        review.comment,
        review.user?.name,
        review.user?.email,
        review.profile?.name,
        review.profile?.slug,
        review.status
      ].join(" ").toLowerCase();
      return statusMatch && (!tokens.length || tokens.every((token) => text.includes(token)));
    });
  }, [reviews, filter, search]);

  async function updateStatus(review: Review, status: "APPROVED" | "REJECTED") {
    const moderationNote = status === "REJECTED" ? window.prompt("Rejection reason", review.moderationNote || "") || "Rejected by admin" : review.moderationNote;
    setReviews((current) => current.map((item) => item.id === review.id ? { ...item, status, moderationNote } : item));
    setNotice(`Review ${status.toLowerCase()}.`);
    const response = await adminFetch(apiUrl(`/api/admin/reviews/${review.id}/status`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, moderationNote })
    }).catch(() => undefined);
    if (response?.ok) {
      const payload = await response.json() as { data?: Review };
      if (payload.data) setReviews((current) => current.map((item) => item.id === review.id ? payload.data! : item));
    }
  }

  async function deleteReview(review: Review) {
    if (!window.confirm("Delete this review permanently?")) return;
    setReviews((current) => current.filter((item) => item.id !== review.id));
    await adminFetch(apiUrl(`/api/admin/reviews/${review.id}`), { method: "DELETE" }).catch(() => undefined);
  }

  return (
    <div>
      <AdminSectionHeader
        eyebrow="Review moderation"
        title="Manage profile reviews"
        description="Approve real user reviews, reject spam, and keep aggregate ratings tied only to approved reviews."
      />

      <GlassCard className="mb-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
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
          <label className="relative block w-full xl:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search review, user, profile"
              className="w-full rounded-2xl border border-white/80 bg-white/75 py-3 pl-11 pr-4 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100"
            />
          </label>
        </div>
        {notice ? <p className="mt-4 rounded-2xl bg-white/65 px-4 py-3 text-sm font-semibold text-muted">{notice}</p> : null}
      </GlassCard>

      <div className="grid gap-4">
        {visible.map((review) => (
          <GlassCard key={review.id} className="p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={tone(review.status)}>{review.status}</StatusPill>
                  <span className="text-sm font-semibold text-muted">{review.rating}/5</span>
                  <span className="text-sm text-muted">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                <h2 className="mt-3 text-xl font-semibold text-ink">{review.title || "Untitled review"}</h2>
                <p className="mt-2 leading-7 text-muted">{review.comment}</p>
                <p className="mt-3 text-sm font-semibold text-ink">
                  {review.user?.name || "User"} on {review.profile?.name || "Profile"}
                </p>
                {review.moderationNote ? <p className="mt-2 text-sm font-semibold text-rose-700">{review.moderationNote}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <IconButton label="Approve" onClick={() => updateStatus(review, "APPROVED")}><CheckCircle2 className="h-4 w-4" /></IconButton>
                <IconButton label="Reject" tone="red" onClick={() => updateStatus(review, "REJECTED")}><XCircle className="h-4 w-4" /></IconButton>
                <IconButton label="Delete" tone="red" onClick={() => deleteReview(review)}><Trash2 className="h-4 w-4" /></IconButton>
              </div>
            </div>
          </GlassCard>
        ))}
        {visible.length === 0 ? (
          <GlassCard>
            <h2 className="text-xl font-semibold text-ink">No reviews found</h2>
            <p className="mt-2 text-sm text-muted">Try a different status or search term.</p>
          </GlassCard>
        ) : null}
      </div>
    </div>
  );
}

function IconButton({ children, label, onClick, tone = "default" }: { children: React.ReactNode; label: string; onClick: () => void; tone?: "default" | "red" }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition ${tone === "red" ? "text-rose-600 hover:bg-rose-50" : "text-emerald-700 hover:bg-emerald-50"}`}
    >
      {children}
    </button>
  );
}
