import type { Metadata } from "next";
import { AdminActions, AdminField, AdminSectionHeader, AdminTable, StatusPill } from "@/components/admin/admin-ui";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { blogPosts } from "@/lib/data";

export const metadata: Metadata = {
  title: "Manage Blog"
};

export default function AdminBlogPage() {
  return (
    <div>
      <AdminSectionHeader
        eyebrow="Blog manager"
        title="Manage blog posts"
        description="Create SEO blog pages, edit titles, descriptions, images, publish status and internal linking."
      />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <GlassCard>
          <h3 className="text-2xl font-semibold text-ink">Add / edit blog post</h3>
          <div className="mt-6 grid gap-5">
            <AdminField label="Post Title" placeholder="Best Astrologer in Delhi" />
            <AdminField label="Post Slug" placeholder="best-astrologer-in-delhi" />
            <AdminField label="Meta Title" placeholder="Best Astrologer in Delhi | Profinr" />
            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">Excerpt / Meta Description</span>
              <textarea rows={4} placeholder="Write post summary..." className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100" />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-ink">Status</span>
              <select className="w-full rounded-2xl border border-slate-200 bg-white text-ink px-4 py-3 text-sm outline-none focus:border-champagne focus:ring-4 focus:ring-amber-100">
                <option>Published</option>
                <option>Draft</option>
                <option>Scheduled</option>
              </select>
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-3"><Button variant="ghost">Save Draft</Button><Button variant="gold">Publish Post</Button></div>
        </GlassCard>

        <AdminTable
          columns={["Post", "Slug", "Date", "Status", "Actions"]}
          rows={blogPosts.map((post) => [
            <span key="title" className="font-semibold text-ink">{post.title}</span>,
            <code key="slug" className="rounded-full bg-white/70 px-3 py-1 text-xs text-ink">/blog/{post.slug}</code>,
            post.date,
            <StatusPill key="status">Published</StatusPill>,
            <AdminActions key="actions" viewHref={`/blog/${post.slug}`} editHref="/admin/blog" />
          ])}
        />
      </div>
    </div>
  );
}
