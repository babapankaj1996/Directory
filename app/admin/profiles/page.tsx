import type { Metadata } from "next";
import { AdminActions, AdminSectionHeader, AdminTable, StatusPill } from "@/components/admin/admin-ui";
import { getListingUrl, isFeaturedActive, listings } from "@/lib/data";

export const metadata: Metadata = {
  title: "Manage Profiles"
};

export default function AdminProfilesPage() {
  return (
    <div>
      <AdminSectionHeader
        eyebrow="Profile manager"
        title="Manage profiles"
        description="Approve, edit, feature, verify, unpublish or delete service provider profiles."
        actionHref="/admin/profiles/new"
        actionLabel="Add Profile"
      />

      <AdminTable
        columns={["Profile", "Profile URL", "Category", "Rating", "Status", "Featured", "Actions"]}
        rows={listings.map((listing) => [
          <span key="name" className="font-semibold text-ink">{listing.name}</span>,
          <code key="url" className="rounded-full bg-white/70 px-3 py-1 text-xs text-ink">{getListingUrl(listing)}</code>,
          listing.category,
          `${listing.rating} / ${listing.reviews} reviews`,
          listing.verified ? <StatusPill key="status">Verified</StatusPill> : <StatusPill key="status" tone="amber">Pending</StatusPill>,
          isFeaturedActive(listing) ? <StatusPill key="featured" tone="blue">Featured</StatusPill> : <StatusPill key="featured" tone="gray">Normal</StatusPill>,
          <AdminActions key="actions" viewHref={getListingUrl(listing)} editHref={`/admin/profiles/${listing.slug}/edit`} />
        ])}
      />
    </div>
  );
}
