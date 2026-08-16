import type { Metadata } from "next";
import { AdminField, AdminSectionHeader, AdminTable, StatusPill } from "@/components/admin/admin-ui";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Manage SEO"
};

const seoPages = [
  { page: "Homepage", url: "/", title: "Profinr | Find Premium Services Near You", status: "Optimized" },
  { page: "Country Page", url: "/in", title: "Best Services in India", status: "Optimized" },
  { page: "City Page", url: "/in/delhi", title: "Best Services in Delhi", status: "Optimized" },
  { page: "Category Page", url: "/in/delhi/astrologer", title: "Best Astrologers in Delhi", status: "Review" },
  { page: "Profile Page", url: "/in/delhi/astrologer/aditya-pareek", title: "Pandit Aditya Pareek", status: "Optimized" }
];

export default function AdminSeoPage() {
  return (
    <div>
      <AdminSectionHeader
        eyebrow="SEO manager"
        title="Manage SEO metadata"
        description="Edit title, description, canonical, index status and schema notes for important SEO pages."
      />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <GlassCard>
          <h3 className="text-2xl font-semibold text-ink">SEO editor</h3>
          <div className="mt-6 grid gap-5">
            <AdminField label="Page URL" placeholder="/in/delhi/astrologer" />
            <AdminField label="Meta Title" placeholder="Best Astrologer in Delhi | Profinr" />
            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">Meta Description</span>
              <textarea rows={4} placeholder="Write SEO description under 160 characters..." className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100" />
            </label>
            <AdminField label="Canonical URL" placeholder="https://example.com/in/delhi/astrologer" />
            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">Robots</span>
              <select className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100">
                <option>index, follow</option>
                <option>noindex, follow</option>
                <option>noindex, nofollow</option>
              </select>
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-3"><Button variant="ghost">Preview SERP</Button><Button variant="gold">Save SEO</Button></div>
        </GlassCard>

        <AdminTable
          columns={["Page", "URL", "Meta Title", "Status"]}
          rows={seoPages.map((page) => [
            <span key="page" className="font-semibold text-ink">{page.page}</span>,
            <code key="url" className="rounded-full bg-white/70 px-3 py-1 text-xs text-ink">{page.url}</code>,
            page.title,
            page.status === "Optimized" ? <StatusPill key="status">Optimized</StatusPill> : <StatusPill key="status" tone="amber">Review</StatusPill>
          ])}
        />
      </div>
    </div>
  );
}
